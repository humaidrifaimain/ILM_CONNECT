export interface CoursePath {
  id: string;
  title: string;
  description: string;
  level: string;
  modules: { id: string; lessons: { id: string }[] }[];
}
export interface CourseRequest {
  id: string;
  learningPathId: string;
  studentId: string;
  lecturerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  learningPath: Pick<CoursePath, 'id' | 'title' | 'description' | 'level'>;
  student: { fullName: string };
}
