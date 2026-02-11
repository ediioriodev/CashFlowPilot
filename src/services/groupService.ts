import { supabase } from "@/lib/supabaseClient";

export const groupService = {
  async getGroupId(): Promise<number | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // First try to find a group where user is a member
    const { data: memberData } = await supabase
      .from('users_group')
      .select('group_id')
      .eq('user_id', user.id)
      .single();

    if (memberData?.group_id) return memberData.group_id;

    return null;
  },

  /**
   * Registers a new user with a new group.
   * Calls the `register_user_with_group` RPC function.
   */
  async registerUserWithGroup(
    userId: string,
    groupName: string,
    firstName: string,
    lastName?: string
  ): Promise<{ success: boolean; groupId?: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('register_user_with_group', {
        p_user_id: userId,
        p_group_name: groupName,
        p_first_name: firstName,
        p_last_name: lastName || null,
      });

      if (error) throw error;

      if (data && data.success) {
        return { success: true, groupId: data.group_id };
      } else {
        return { success: false, error: data?.error || 'Errore sconosciuto nella registrazione' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
