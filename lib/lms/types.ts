export type Style = 'visual' | 'auditory' | 'kinesthetic';
export type LearningStyle = Style;
export type Role = 'student' | 'teacher';
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected';
export type PracticeActivity = { type: 'single'; options: string[]; answer: number } | { type: 'ordering'; options: string[]; answer: string[] };
export type Block = { id: string; type: 'text' | 'heading' | 'list' | 'image' | 'audio' | 'practice' | 'pdf'; text: string; url?: string; transcript?: string; activity?: PracticeActivity };
export type StudySession = { id: string; completed_blocks: string[]; completed: boolean };
export type Variant = { id: string; styles: Style[]; blocks: Block[] };
type QuestionBase = { id: string; prompt: string; options: string[]; rightOptions?: string[] };
export type Question = QuestionBase & (
  | { type: 'single'; answer?: number }
  | { type: 'boolean'; answer?: boolean }
  | { type: 'multiple'; answer?: number[] }
  | { type: 'short' | 'ordering'; answer?: string[] }
  | { type: 'matching'; answer?: Record<string, string> }
);
export type Course = { id: string; title: string; description: string; teacher_id: string; published: boolean };
export type Profile = { id: string; display_name: string; role: Role; preferred_style: Style | null; assessment_completed: boolean };
export type Lesson = { id: string; course_id: string; title: string; position: number; published: boolean; current_revision_id?: string | null };
export type LessonRevision = { id: string; content: Variant[]; questions: Question[]; threshold: number };
export type LessonInput = { id?: string; title: string; position: number; content: Variant[]; questions: Question[]; threshold: number };
export type AttemptResult = { id?: string; passed: boolean; score: number; total: number; percentage: number; preview?: boolean };
export const STYLE_LABELS: Record<Style, string> = { visual: 'Wzrokowiec', auditory: 'Słuchowiec', kinesthetic: 'Kinestetyk' };
