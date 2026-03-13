import { supabase } from './supabase';

export const staffApi = {
    async updateRole(id: string, role: string, firmId: string, adminId: string) {
        const { data, error } = await supabase
            .from('user_firm_roles')
            .update({ role })
            .eq('user_id', id)
            .eq('firm_id', firmId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    },

    async toggleStatus(id: string, status: string, firmId: string, adminId: string) {
        // Toggle status in user_firm_roles
        const { data, error } = await supabase
            .from('user_firm_roles')
            .update({ status })
            .eq('user_id', id)
            .eq('firm_id', firmId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    },

    async deleteStaff(id: string, firmId: string, adminId: string, adminRole: string) {
        // Soft delete in user_firm_roles
        const { data, error } = await supabase
            .from('user_firm_roles')
            .update({ status: 'deleted' })
            .eq('user_id', id)
            .eq('firm_id', firmId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    }
};
