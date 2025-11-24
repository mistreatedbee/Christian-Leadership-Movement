import { insforge } from './insforge';

/**
 * Ensures the user exists in the users table before file uploads.
 * This prevents foreign key constraint violations in _storage table.
 * 
 * @param userId - The user ID to ensure exists
 * @param userEmail - Optional user email
 * @param userName - Optional user name/nickname
 * @returns Promise that resolves when user is guaranteed to exist
 */
export async function ensureUserExists(
  userId: string,
  userEmail?: string | null,
  userName?: string | null
): Promise<void> {
  try {
    // Use upsert to ensure user exists in public.users table
    // This handles both creation and updates, and avoids race conditions
    const { data: userData, error: upsertError } = await insforge.database
      .from('users')
      .upsert([{ 
        id: userId,
        email: userEmail || null,
        nickname: userName || null,
        name: userName || null
      }], {
        onConflict: 'id'
      })
      .select()
      .single();
    
    if (upsertError) {
      // If upsert fails, try to check if user exists
      const { data: existingUser, error: checkError } = await insforge.database
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user after upsert failed:', checkError);
        throw new Error(`Failed to ensure user exists: ${checkError.message}`);
      }
      
      if (!existingUser) {
        // User doesn't exist and upsert failed, try insert
        try {
          const { error: insertError } = await insforge.database
            .from('users')
            .insert([{ 
              id: userId,
              email: userEmail || null,
              nickname: userName || null,
              name: userName || null
            }]);
          
          if (insertError) {
            // If it's a duplicate key error, that's okay - user was created by another process
            if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
              console.log('User record already exists (race condition), continuing...');
            } else {
              console.error('Error creating user record:', insertError);
              throw new Error(`Failed to create user record: ${insertError.message}`);
            }
          } else {
            console.log('User record created successfully via insert');
          }
        } catch (insertErr: any) {
          // Handle duplicate key errors gracefully
          if (insertErr.code === '23505' || insertErr.message?.includes('duplicate') || insertErr.message?.includes('unique')) {
            console.log('User record already exists, continuing...');
          } else {
            throw insertErr;
          }
        }
      } else {
        console.log('User record exists (verified after upsert failed)');
      }
    } else if (userData) {
      console.log('User record ensured via upsert:', userData.id);
    }
    
    // Wait longer to ensure the record is committed and any triggers have run
    // This is important for foreign key constraints in _storage table
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (err: any) {
    console.error('Error ensuring user exists:', err);
    throw new Error(`Failed to verify user account: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Uploads a file with automatic user existence check and retry logic for foreign key errors.
 * 
 * @param bucket - The storage bucket name
 * @param filePath - The path where the file should be stored
 * @param file - The file to upload
 * @param userId - The user ID (for ensuring user exists)
 * @param userEmail - Optional user email
 * @param userName - Optional user name
 * @returns Promise resolving to upload data with url and key
 */
export async function uploadFileWithUserCheck(
  bucket: string,
  filePath: string,
  file: File,
  userId: string,
  userEmail?: string | null,
  userName?: string | null
): Promise<{ url: string; key: string }> {
  // CRITICAL: Verify user is authenticated and session is valid
  // The _storage table's uploaded_by FK references auth.users
  try {
    const { data: { session }, error: sessionError } = await insforge.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Authentication session is invalid. Please log in again.');
    }
    
    if (!session || !session.user) {
      throw new Error('No active session found. Please log in again.');
    }
    
    if (session.user.id !== userId) {
      console.warn('Session user ID mismatch:', { sessionUserId: session.user.id, providedUserId: userId });
      // Use the session user ID instead
      userId = session.user.id;
    }
    
    console.log('Verified auth session for user:', userId);
  } catch (sessionErr: any) {
    console.error('Error verifying session:', sessionErr);
    throw new Error('Failed to verify authentication. Please log in again.');
  }
  
  // CRITICAL: Ensure user exists in public.users FIRST
  // This is important because _storage.uploaded_by references auth.users,
  // but we need to ensure public.users exists for our app logic
  await ensureUserExists(userId, userEmail, userName);
  
  // Wait longer to ensure database consistency and auth sync
  // The _storage table's uploaded_by FK references auth.users, which should
  // exist when user signs up, but we need to give it time to sync
  // Increased wait time to allow auth.users to fully sync
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try upload with retry logic
  let lastError: any = null;
  const maxRetries = 5; // Increased retries
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries} for user ${userId}`);
      
      const { data: uploadData, error: uploadError } = await insforge.storage
        .from(bucket)
        .upload(filePath, file);
      
      if (uploadError) {
        lastError = uploadError;
        
        // Check if it's a foreign key constraint error
        const isForeignKeyError = uploadError.message?.includes('foreign key') || 
            uploadError.message?.includes('uploaded_by') || 
            uploadError.message?.includes('_storage') ||
            uploadError.message?.includes('violates foreign key constraint');
        
        if (isForeignKeyError) {
          console.log(`Foreign key error on attempt ${attempt}, ensuring user exists and waiting...`);
          
          // Try to ensure user exists in public.users with upsert
          try {
            const { error: upsertError } = await insforge.database
              .from('users')
              .upsert([{ 
                id: userId, 
                email: userEmail || null,
                nickname: userName || null,
                name: userName || null
              }], {
                onConflict: 'id'
              });
            
            if (upsertError) {
              console.warn('Upsert error (may be non-fatal):', upsertError);
            } else {
              console.log('User record upserted successfully');
            }
          } catch (upsertErr: any) {
            console.warn('Upsert exception (non-fatal):', upsertErr);
          }
          
          // Wait progressively longer on each retry
          // The _storage table references auth.users, which should exist
          // but there might be a sync delay
          const waitTime = attempt * 1000; // 1s, 2s, 3s, 4s, 5s
          console.log(`Waiting ${waitTime}ms for auth.users sync...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Generate new file path for retry to avoid conflicts
          if (attempt < maxRetries) {
            const pathParts = filePath.split('/');
            const fileName = pathParts[pathParts.length - 1];
            filePath = `${pathParts.slice(0, -1).join('/')}/${Date.now()}_${fileName}`;
            console.log(`Retrying with new path: ${filePath}`);
            continue; // Retry with new path
          }
        } else {
          // Non-foreign-key error, throw immediately
          console.error('Non-foreign-key upload error:', uploadError);
          throw uploadError;
        }
      } else if (uploadData) {
        // Success!
        console.log('Upload succeeded!', uploadData);
        return uploadData;
      } else {
        throw new Error('Upload completed but no data returned');
      }
    } catch (err: any) {
      lastError = err;
      
      // Check if it's a foreign key error
      const isForeignKeyError = err.message?.includes('foreign key') || 
          err.message?.includes('uploaded_by') || 
          err.message?.includes('_storage') ||
          err.message?.includes('violates foreign key constraint');
      
      // If it's not a foreign key error, throw immediately
      if (!isForeignKeyError) {
        console.error('Non-foreign-key error, throwing:', err);
        throw err;
      }
      
      if (attempt === maxRetries) {
        // Last attempt failed
        console.error('All upload attempts failed due to foreign key constraint');
        throw new Error(
          `Failed to upload file after ${maxRetries} attempts. ` +
          `The user account may not be fully synced. Please try again in a few moments, ` +
          `or contact support if the issue persists. Error: ${err.message}`
        );
      }
    }
  }
  
  // Should never reach here, but just in case
  throw new Error(`Failed to upload file: ${lastError?.message || 'Unknown error'}`);
}

