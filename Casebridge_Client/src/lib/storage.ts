import { supabase } from './supabase';

export const uploadDocument = async (
    file: File,
    matterId: string,
    clientId: string
) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${matterId}/${clientId}/${fileName}`;

    // 1. Upload to Supabase Storage
    const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Register in Database
    const { error: dbError } = await supabase.from('documents').insert({
        matter_id: matterId,
        client_id: clientId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        size_bytes: file.size,
    });

    if (dbError) {
        // Cleanup storage if database insert fails
        await supabase.storage.from('documents').remove([filePath]);
        throw dbError;
    }

    return data;
};

export const deleteDocument = async (id: string, filePath: string) => {
    const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase.from('documents').delete().eq('id', id);
    if (dbError) throw dbError;
};

export const getDocumentUrl = async (filePath: string) => {
    const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60); // 60 seconds expiry

    return data?.signedUrl;
};
