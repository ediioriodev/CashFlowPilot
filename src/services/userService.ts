import { supabase } from "@/lib/supabaseClient";

export interface UserProfile {
  id: string; // From auth.users
  email: string;
  first_name: string;
  last_name: string;
  group_id: number | null;
  group_name?: string;
}

export interface UserSettings {
  notifications_enabled: boolean;
  notification_time: string;
  dark_mode: boolean;
  del_confirm: boolean;
  show_shared_expenses: boolean; // Not relevant for this web app structure effectively, but kept for compatibility
  show_personal_expenses: boolean; // Not relevant for this web app structure effectively, but kept for compatibility
  custom_period_active: boolean;
  custom_period_start_day: number;
}

export const userService = {
  async getProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('users_group')
      .select('first_name, last_name, group_id')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return null;
    }

    let groupName = undefined;
    if (profile?.group_id) {
       const { data: group } = await supabase
         .from('groups_account')
         .select('group_name')
         .eq('id', profile.group_id)
         .single();
       groupName = group?.group_name;
    }

    return {
      id: user.id,
      email: user.email || '',
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      group_id: profile?.group_id || null,
      group_name: groupName
    };
  },

  async updateProfile(updates: { first_name: string; last_name: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from('users_group')
      .update(updates)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async getSettings(): Promise<UserSettings> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('users_group')
      .select('notifications_enabled, notification_time, dark_mode, del_confirm, show_shared_expenses, show_personal_expenses, custom_period_active, custom_period_start_day')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error("Error fetching settings", error);
      // Return defaults
      return {
        notifications_enabled: true,
        notification_time: '19:30',
        dark_mode: false,
        del_confirm: true,
        show_shared_expenses: true,
        show_personal_expenses: true,
        custom_period_active: false,
        custom_period_start_day: 1
      };
    }
    
    // Ensure defaults if null
    return {
        ...data,
        notifications_enabled: data.notifications_enabled ?? true,
        show_shared_expenses: data.show_shared_expenses ?? true,
        show_personal_expenses: data.show_personal_expenses ?? true,
        del_confirm: data.del_confirm ?? true,
        dark_mode: data.dark_mode ?? false,
        custom_period_active: data.custom_period_active ?? false,
        custom_period_start_day: data.custom_period_start_day ?? 1
    };
  },

  async updateSettings(updates: Partial<UserSettings>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from('users_group')
      .update(updates)
      .eq('user_id', user.id);

    if (error) throw error;
  }
};
