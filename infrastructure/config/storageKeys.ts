export const STORAGE_KEY_HOSTS = 'ALinLink_hosts_v1';
export const STORAGE_KEY_KEYS = 'ALinLink_keys_v1';
export const STORAGE_KEY_GROUPS = 'ALinLink_groups_v1';
export const STORAGE_KEY_CUSTOM_GROUPS = STORAGE_KEY_GROUPS;
export const STORAGE_KEY_SNIPPETS = 'ALinLink_snippets_v1';
export const STORAGE_KEY_SNIPPET_PACKAGES = 'ALinLink_snippet_packages_v1';
/** Last-filled values per snippet id for {{variable}} placeholders. */
export const STORAGE_KEY_SNIPPET_VAR_VALUES = 'ALinLink_snippet_var_values_v1';
export const STORAGE_KEY_THEME = 'ALinLink_theme_v1';
export const STORAGE_KEY_COLOR = 'ALinLink_color_v1';
export const STORAGE_KEY_ACCENT_MODE = 'ALinLink_accent_mode_v1';
export const STORAGE_KEY_UI_THEME_LIGHT = 'ALinLink_ui_theme_light_v1';
export const STORAGE_KEY_UI_THEME_DARK = 'ALinLink_ui_theme_dark_v1';
export const STORAGE_KEY_UI_FONT_FAMILY = 'ALinLink_ui_font_family_v1';
export const STORAGE_KEY_SYNC = 'ALinLink_sync_v1';
export const STORAGE_KEY_TERM_THEME = 'ALinLink_term_theme_v1';
export const STORAGE_KEY_TERM_FOLLOW_APP_THEME = 'ALinLink_term_follow_app_theme_v1';
export const STORAGE_KEY_TERM_THEME_DARK = 'ALinLink_term_theme_dark_v1';
export const STORAGE_KEY_TERM_THEME_LIGHT = 'ALinLink_term_theme_light_v1';
export const STORAGE_KEY_TERM_FONT_FAMILY = 'ALinLink_term_font_family_v1';
export const STORAGE_KEY_TERM_FONT_SIZE = 'ALinLink_term_font_size_v1';
export const STORAGE_KEY_TERM_SETTINGS = 'ALinLink_term_settings_v1';
export const STORAGE_KEY_HOTKEY_SCHEME = 'ALinLink_hotkey_scheme_v1';
export const STORAGE_KEY_CUSTOM_KEY_BINDINGS = 'ALinLink_custom_key_bindings_v1';
export const STORAGE_KEY_HOTKEY_RECORDING = 'ALinLink_hotkey_recording_v1';
export const STORAGE_KEY_CUSTOM_CSS = 'ALinLink_custom_css_v1';
export const STORAGE_KEY_UI_LANGUAGE = 'ALinLink_ui_language_v1';
export const STORAGE_KEY_PORT_FORWARDING = 'ALinLink_port_forwarding_v1';
export const STORAGE_KEY_PF_PREFER_FORM_MODE = 'ALinLink_pf_prefer_form_mode_v1';
export const STORAGE_KEY_PF_VIEW_MODE = 'ALinLink_pf_view_mode_v1';
export const STORAGE_KEY_KNOWN_HOSTS = 'ALinLink_known_hosts_v1';
export const STORAGE_KEY_SHELL_HISTORY = 'ALinLink_shell_history_v1';
export const STORAGE_KEY_CONNECTION_LOGS = 'ALinLink_connection_logs_v1';
export const STORAGE_KEY_IDENTITIES = 'ALinLink_identities_v1';
export const STORAGE_KEY_PROXY_PROFILES = 'ALinLink_proxy_profiles_v1';
export const STORAGE_KEY_VAULT_HOSTS_VIEW_MODE = 'ALinLink_vault_hosts_view_mode_v1';
export const STORAGE_KEY_VAULT_HOSTS_SORT_MODE = 'ALinLink_vault_hosts_sort_mode_v1';
export const STORAGE_KEY_VAULT_HOSTS_TREE_EXPANDED = 'ALinLink_vault_hosts_tree_expanded_v1';
export const STORAGE_KEY_VAULT_SIDEBAR_COLLAPSED = 'ALinLink_vault_sidebar_collapsed_v1';
export const STORAGE_KEY_VAULT_SIDEBAR_WIDTH = 'ALinLink_vault_sidebar_width_v1';
export const STORAGE_KEY_VAULT_KEYS_VIEW_MODE = 'ALinLink_vault_keys_view_mode_v1';
export const STORAGE_KEY_VAULT_PROXY_PROFILES_VIEW_MODE = 'ALinLink_vault_proxy_profiles_view_mode_v1';
export const STORAGE_KEY_VAULT_SNIPPETS_VIEW_MODE = 'ALinLink_vault_snippets_view_mode_v1';
/** Inline snippet script editor height (px) in vault edit panel. */
export const STORAGE_KEY_SNIPPET_SCRIPT_EDITOR_HEIGHT = 'ALinLink_snippet_script_editor_height_v1';
export const STORAGE_KEY_VAULT_KNOWN_HOSTS_VIEW_MODE = 'ALinLink_vault_known_hosts_view_mode_v1';

// Update check
export const STORAGE_KEY_UPDATE_LAST_CHECK = 'ALinLink_update_last_check_v1';
export const STORAGE_KEY_UPDATE_DISMISSED_VERSION = 'ALinLink_update_dismissed_version_v1';
export const STORAGE_KEY_UPDATE_LATEST_RELEASE = 'ALinLink_update_latest_release_v1';
export const STORAGE_KEY_AUTO_UPDATE_ENABLED = 'ALinLink_auto_update_enabled_v1';
export const STORAGE_KEY_LOCAL_VAULT_BACKUP_MAX_COUNT = 'ALinLink_local_vault_backup_max_count_v1';
export const STORAGE_KEY_LOCAL_VAULT_BACKUP_LAST_APP_VERSION = 'ALinLink_local_vault_backup_last_app_version_v1';

/**
 * Cross-window barrier: set while a local vault restore is applying so
 * auto-sync in another window doesn't upload a pre-restore snapshot
 * concurrently. The value is an epoch-ms deadline — auto-sync treats any
 * value in the future as "restore in progress" and any value in the past
 * as a stale lock that can be ignored. See useAutoSync and
 * CloudSyncSettings for readers/writers.
 */
export const STORAGE_KEY_VAULT_RESTORE_IN_PROGRESS_UNTIL = 'ALinLink_vault_restore_in_progress_until_v1';

/**
 * Apply-in-progress sentinel. Set before a destructive applySyncPayload
 * starts writing and cleared after it completes successfully. If this
 * value is present on a later startup, the previous apply was
 * interrupted mid-way (renderer crash, power loss, IPC failure) and the
 * local vault is a partial mix of pre-apply and post-apply state.
 * Auto-sync must refuse to push in that window — otherwise the partial
 * state would silently overwrite an intact cloud copy — until the user
 * manually restores from a protective backup or completes a full merge.
 * The value is a JSON-encoded record (startedAt, protectiveBackupId,
 * source) so the UI can surface a specific recovery hint rather than a
 * generic "something broke" warning.
 */
export const STORAGE_KEY_VAULT_APPLY_IN_PROGRESS = 'ALinLink_vault_apply_in_progress_v1';

// SFTP File Opener Associations
export const STORAGE_KEY_SFTP_FILE_ASSOCIATIONS = 'ALinLink_sftp_file_associations_v1';
export const STORAGE_KEY_SFTP_DEFAULT_OPENER = 'ALinLink_sftp_default_opener_v1';

// SFTP Local Bookmarks
export const STORAGE_KEY_SFTP_LOCAL_BOOKMARKS = 'ALinLink_sftp_local_bookmarks_v1';

// SFTP Global Bookmarks (shared across all hosts)
export const STORAGE_KEY_SFTP_GLOBAL_BOOKMARKS = 'ALinLink_sftp_global_bookmarks_v1';

// SFTP Settings
export const STORAGE_KEY_SFTP_DOUBLE_CLICK_BEHAVIOR = 'ALinLink_sftp_double_click_behavior_v1';
export const STORAGE_KEY_SFTP_AUTO_SYNC = 'ALinLink_sftp_auto_sync_v1';
export const STORAGE_KEY_SFTP_SHOW_HIDDEN_FILES = 'ALinLink_sftp_show_hidden_files_v1';
export const STORAGE_KEY_SFTP_USE_COMPRESSED_UPLOAD = 'ALinLink_sftp_use_compressed_upload_v1';
export const STORAGE_KEY_SFTP_AUTO_OPEN_SIDEBAR = 'ALinLink_sftp_auto_open_sidebar_v1';
export const STORAGE_KEY_SFTP_DEFAULT_VIEW_MODE = 'ALinLink_sftp_default_view_mode_v1';
export const STORAGE_KEY_SFTP_HOST_VIEW_MODES = 'ALinLink_sftp_host_view_modes_v1';
export const STORAGE_KEY_SFTP_TRANSFER_PANEL_HEIGHT = 'ALinLink_sftp_transfer_panel_height_v1';
export const STORAGE_KEY_SFTP_TRANSFER_CHILD_NAME_WIDTH = 'ALinLink_sftp_transfer_child_name_width_v1';

// Editor Settings
export const STORAGE_KEY_EDITOR_WORD_WRAP = 'ALinLink_editor_word_wrap_v1';

// Session Logs Settings
export const STORAGE_KEY_SESSION_LOGS_ENABLED = 'ALinLink_session_logs_enabled_v1';
export const STORAGE_KEY_SESSION_LOGS_DIR = 'ALinLink_session_logs_dir_v1';
export const STORAGE_KEY_SESSION_LOGS_FORMAT = 'ALinLink_session_logs_format_v1';
export const STORAGE_KEY_SSH_DEBUG_LOGS_ENABLED = 'ALinLink_ssh_debug_logs_enabled_v1';

// Archived legacy key records that are no longer supported by the app (e.g. biometric/WebAuthn/FIDO2 experiments).
export const STORAGE_KEY_LEGACY_KEYS = 'ALinLink_legacy_keys_v1';

// Managed Sources - external files that manage groups of hosts (e.g., ~/.ssh/config)
export const STORAGE_KEY_MANAGED_SOURCES = 'ALinLink_managed_sources_v1';

// Global Toggle Window Settings (Quake Mode)
export const STORAGE_KEY_TOGGLE_WINDOW_HOTKEY = 'ALinLink_toggle_window_hotkey_v1';
export const STORAGE_KEY_CLOSE_TO_TRAY = 'ALinLink_close_to_tray_v1';
export const STORAGE_KEY_GLOBAL_HOTKEY_ENABLED = 'ALinLink_global_hotkey_enabled_v1';

// Custom Terminal Themes
export const STORAGE_KEY_CUSTOM_THEMES = 'ALinLink_custom_themes_v1';

// AI Settings
export const STORAGE_KEY_AI_PROVIDERS = 'ALinLink_ai_providers_v1';
export const STORAGE_KEY_AI_ACTIVE_PROVIDER = 'ALinLink_ai_active_provider_v1';
export const STORAGE_KEY_AI_ACTIVE_MODEL = 'ALinLink_ai_active_model_v1';
export const STORAGE_KEY_AI_PERMISSION_MODE = 'ALinLink_ai_permission_mode_v1';
export const STORAGE_KEY_AI_TOOL_INTEGRATION_MODE = 'ALinLink_ai_tool_integration_mode_v1';
export const STORAGE_KEY_AI_HOST_PERMISSIONS = 'ALinLink_ai_host_permissions_v1';
export const STORAGE_KEY_AI_EXTERNAL_AGENTS = 'ALinLink_ai_external_agents_v1';
export const STORAGE_KEY_AI_DEFAULT_AGENT = 'ALinLink_ai_default_agent_v1';
export const STORAGE_KEY_AI_COMMAND_BLOCKLIST = 'ALinLink_ai_command_blocklist_v1';
export const STORAGE_KEY_AI_COMMAND_TIMEOUT = 'ALinLink_ai_command_timeout_v1';
export const STORAGE_KEY_AI_MAX_ITERATIONS = 'ALinLink_ai_max_iterations_v1';
export const STORAGE_KEY_AI_SESSIONS = 'ALinLink_ai_sessions_v1';
export const STORAGE_KEY_AI_ACTIVE_SESSION_MAP = 'ALinLink_ai_active_session_map_v1';
export const STORAGE_KEY_AI_AGENT_MODEL_MAP = 'ALinLink_ai_agent_model_map_v1';
export const STORAGE_KEY_AI_AGENT_PROVIDER_MAP = 'ALinLink_ai_agent_provider_map_v1';
export const STORAGE_KEY_AI_WEB_SEARCH = 'ALinLink_ai_web_search_v1';

// SFTP Transfer Concurrency
export const STORAGE_KEY_SFTP_TRANSFER_CONCURRENCY = 'ALinLink_sftp_transfer_concurrency_v1';

// Workspace Focus Indicator Style
export const STORAGE_KEY_WORKSPACE_FOCUS_STYLE = 'ALinLink_workspace_focus_style_v1';

// Immersive Mode
export const STORAGE_KEY_IMMERSIVE_MODE = 'ALinLink_immersive_mode_v1';

// Vault: Show Recently Connected hosts section
export const STORAGE_KEY_SHOW_RECENT_HOSTS = 'ALinLink_show_recent_hosts_v1';
export const STORAGE_KEY_SHOW_ONLY_UNGROUPED_HOSTS_IN_ROOT = 'ALinLink_show_only_ungrouped_hosts_in_root_v1';

// Top tabs: Show standalone SFTP view tab
export const STORAGE_KEY_SHOW_SFTP_TAB = 'ALinLink_show_sftp_tab_v1';

// Group Configurations (default settings inherited by hosts)
export const STORAGE_KEY_GROUP_CONFIGS = 'ALinLink_group_configs_v1';

// Side Panel
export const STORAGE_KEY_SIDE_PANEL_WIDTH = 'ALinLink_side_panel_width';
export const STORAGE_KEY_WORKSPACE_FOCUS_SIDEBAR_WIDTH = 'ALinLink_workspace_focus_sidebar_width';

// Port Forwarding (transient cross-window broadcast key)
export const STORAGE_KEY_PF_RECONNECT_CANCEL = '__ALinLink_pf_cancel_reconnect';

// Default SSH Key Passphrases (for ~/.ssh keys not managed in the vault)
export const STORAGE_KEY_DEFAULT_KEY_PASSPHRASES = 'ALinLink_default_key_passphrases_v1';

// Debug Flags (no _v1 suffix — developer-only, not persisted data)
export const STORAGE_KEY_DEBUG_HOTKEYS = 'debug.hotkeys';
export const STORAGE_KEY_DEBUG_UPDATE_DEMO = 'debug.updateDemo';
