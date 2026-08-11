export type ParticipantRole = "owner" | "racer" | "viewer";
export type ProgressSource = "manual" | "github";
export type CompletedVia = "manual" | "github_commit" | "github_pr" | "github_issue";
export type TaskStatus = "todo" | "done";

export interface Profile {
  id: string;
  username: string | null;
  avatar_color: string;
  avatar_emoji: string;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  start_date: string;
  end_date: string;
  theme: string;
  is_public: boolean;
  share_token: string;
  created_at: string;
}

export interface Checkpoint {
  id: string;
  project_id: string;
  title: string;
  target_date: string;
  sort_order: number;
  progress_source: ProgressSource;
  created_by: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  project_id: string;
  user_id: string;
  role: ParticipantRole;
  github_repo_full_name: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface CheckpointCompletion {
  id: string;
  checkpoint_id: string;
  participant_id: string;
  completed_at: string | null;
  completed_via: CompletedVia | null;
  evidence_url: string | null;
}

export interface Task {
  id: string;
  checkpoint_id: string;
  title: string;
  due_date: string | null;
  status: TaskStatus;
  sort_order: number;
  assigned_participant_id: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Comment {
  id: string;
  project_id: string;
  checkpoint_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  author?: Participant;
}

export interface Invite {
  id: string;
  project_id: string;
  role: "racer" | "viewer";
  token: string;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
}

// Minimal Database type so supabase-js can type query builders.
// Regenerate with `supabase gen types typescript` once the project is linked
// for full type safety; this hand-written version keeps the app compiling
// and reasonably typed in the meantime.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> };
      checkpoints: { Row: Checkpoint; Insert: Partial<Checkpoint>; Update: Partial<Checkpoint> };
      participants: { Row: Participant; Insert: Partial<Participant>; Update: Partial<Participant> };
      checkpoint_completions: {
        Row: CheckpointCompletion;
        Insert: Partial<CheckpointCompletion>;
        Update: Partial<CheckpointCompletion>;
      };
      invites: { Row: Invite; Insert: Partial<Invite>; Update: Partial<Invite> };
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
      comments: { Row: Comment; Insert: Partial<Comment>; Update: Partial<Comment> };
    };
  };
}

export const AVATAR_EMOJIS = ["🐢", "🚗", "🚀", "🦄", "🐸", "🏃", "🐇", "🐙", "🦖", "🛴"];
export const AVATAR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFD166",
  "#A78BFA",
  "#F472B6",
  "#60A5FA",
  "#34D399",
  "#FB923C",
];
