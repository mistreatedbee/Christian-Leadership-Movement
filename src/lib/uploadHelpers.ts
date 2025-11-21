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
    // First, ensure user exists in public.users table
    // Check if user exists
    const { data: existingUser, error: checkError } = await insforge.database
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError);
      throw checkError;
    }
    
    if (!existingUser) {
      console.log('User not found in users table, creating record...');
      // Try to insert, but handle if it already exists (race condition)
      try {
        const { data: newUser, error: insertError } = await insforge.database
          .from('users')
          .insert([{ 
            id: userId,
            email: userEmail || null,
            nickname: userName || null
          }])
          .select()
          .single();
        
        if (insertError) {
          // If it's a duplicate key error, that's okay - user was created by another process
          if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
            console.log('User record already exists (race condition), continuing...');
          } else {
            console.error('Error creating user record:', insertError);
            throw new Error(`Failed to create user record: ${insertError.message}`);
          }
        } else if (newUser) {
          console.log('User record created successfully:', newUser.id);
        }
      } catch (insertErr: any) {
        // Handle duplicate key errors gracefully
        if (insertErr.code === '23505' || insertErr.message?.includes('duplicate') || insertErr.message?.includes('unique')) {
          console.log('User record already exists, continuing...');
        } else {
          throw insertErr;
        }
      }
      
      // Wait a moment to ensure the record is committed
      await new Promise(resolve => setTimeout(resolve, 200));
    } else {
      console.log('User record exists:', existingUser.id);
    }
    
    // Additional wait to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100));
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
  // Ensure user exists in public.users (for our app)
  await ensureUserExists(userId, userEmail, userName);
  
  // Additional wait to ensure database consistency
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Try upload with retry logic
  let lastError: any = null;
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries} for user ${userId}`);
      
      const { data: uploadData, error: uploadError } = await insforge.storage
        .from(bucket)
        .upload(filePath, file);
      
      if (uploadError) {
        lastError = uploadError;
        
        // If it's a foreign key error, we need to ensure user exists in auth.users
        // Since we can't directly access auth.users, we'll ensure public.users exists
        // and wait longer for the auth system to sync
        if (uploadError.message?.includes('foreign key') || 
            uploadError.message?.includes('uploaded_by') || 
            uploadError.message?.includes('_storage')) {
          
          console.log(`Foreign key error on attempt ${attempt}, ensuring user exists...`);
          
          // Ensure user exists in public.users (this should trigger any sync mechanisms)
          try {
            const { error: upsertError } = await insforge.database
              .from('users')
              .upsert([{ 
                id: userId, 
                email: userEmail || null,
                nickname: userName || null
              }], {
                onConflict: 'id'
              });
            
            if (upsertError) {
              console.warn('Upsert error (may be non-fatal):', upsertError);
            }
          } catch (upsertErr) {
            console.warn('Upsert exception (non-fatal):', upsertErr);
          }
          
          // Wait progressively longer on each retry
          const waitTime = attempt * 500; // 500ms, 1000ms, 1500ms
          console.log(`Waiting ${waitTime}ms for database sync...`);
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
          throw uploadError;
        }
      } else if (uploadData) {
        // Success!
        console.log('Upload succeeded!');
        return uploadData;
      } else {
        throw new Error('Upload completed but no data returned');
      }
    } catch (err: any) {
      lastError = err;
      
      // If it's not a foreign key error or we've exhausted retries, throw
      if (!err.message?.includes('foreign key') && 
          !err.message?.includes('uploaded_by') && 
          !err.message?.includes('_storage')) {
        throw err;
      }
      
      if (attempt === maxRetries) {
        // Last attempt failed
        console.error('All upload attempts failed');
        throw new Error(`Failed to upload file after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
  
  // Should never reach here, but just in case
  throw new Error(`Failed to upload file: ${lastError?.message || 'Unknown error'}`);
}

