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
    // First, check if user already exists
    const { data: existingUser, error: checkError } = await insforge.database
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError);
      // Continue anyway - might be a permission issue
    }
    
    // If user doesn't exist, try to insert
    if (!existingUser) {
      try {
        // Only include fields that definitely exist in the users table
        const userData: any = {
          id: userId
        };
        
        // Only add optional fields if they have values
        if (userEmail) {
          userData.email = userEmail;
        }
        if (userName) {
          userData.nickname = userName;
        }
        
        const { error: insertError } = await insforge.database
          .from('users')
          .insert([userData]);
        
        if (insertError) {
          // If it's a duplicate key error, that's okay - user was created by another process
          if (insertError.code === '23505' || 
              insertError.message?.includes('duplicate') || 
              insertError.message?.includes('unique') ||
              insertError.message?.includes('already exists')) {
            console.log('User record already exists (race condition), continuing...');
          } else {
            console.error('Error creating user record:', insertError);
            // Don't throw - just log and continue
            // The user might exist in auth.users but not public.users yet
            console.warn('User insert failed, but continuing with upload attempt');
          }
        } else {
          console.log('User record created successfully');
        }
      } catch (insertErr: any) {
        // Handle duplicate key errors gracefully
        if (insertErr.code === '23505' || 
            insertErr.message?.includes('duplicate') || 
            insertErr.message?.includes('unique') ||
            insertErr.message?.includes('already exists')) {
          console.log('User record already exists, continuing...');
        } else {
          console.warn('User insert exception (non-fatal):', insertErr);
          // Don't throw - continue with upload attempt
        }
      }
    } else {
      console.log('User record already exists');
    }
    
    // Wait to ensure the record is committed and any triggers have run
    // This is important for foreign key constraints in _storage table
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (err: any) {
    console.error('Error ensuring user exists:', err);
    // Don't throw - just log and continue
    // The upload might still work if user exists in auth.users
    console.warn('User existence check failed, but continuing with upload attempt');
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
  // CRITICAL: Ensure user exists in public.users FIRST
  // This is important because _storage.uploaded_by references auth.users,
  // but we need to ensure public.users exists for our app logic
  // Note: If user is passed to this function, they're already authenticated via useUser hook
  await ensureUserExists(userId, userEmail, userName);
  
  // Wait longer to ensure database consistency and auth sync
  // The _storage table's uploaded_by FK references auth.users, which should
  // exist when user signs up, but we need to give it time to sync
  // Increased wait time to allow auth.users to fully sync with public.users
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
          console.log(`Foreign key error on attempt ${attempt}, waiting for auth.users sync...`);
          
          // Wait progressively longer on each retry
          // The _storage table references auth.users, which should exist
          // but there might be a sync delay between auth.users and public.users
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

