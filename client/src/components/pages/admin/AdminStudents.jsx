import { useEffect, useState } from 'react';
import api from '@/api/axiosInstance';
import { Badge, Spinner, EmptyState } from '@/components/shared';
import { Search } from 'lucide-react';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [sem, setSem] = useState('');
  const [minAttendance, setMinAttendance] = useState('');
  const [maxAttendance, setMaxAttendance] = useState('');
  const [leaveStatus, setLeaveStatus] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.q = search;
      if (dept) params.department = dept;
      if (sem) params.semester = sem;
      if (minAttendance) params.min_attendance = minAttendance;
      if (maxAttendance) params.max_attendance = maxAttendance;
      if (leaveStatus) params.leave_status = leaveStatus;

      const endpoint = search ? '/users/students/search' : '/users/students';
      const { data } = await api.get(endpoint, { params });
      setStudents(data.data.students);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, dept, sem, minAttendance, maxAttendance, leaveStatus]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Students</h1>

      <div className="card p-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input pl-9"
            placeholder="Search name or roll no..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select className="input" value={dept} onChange={(event) => setDept(event.target.value)}>
          <option value="">All Departments</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Electronics">Electronics</option>
        </select>
        <select className="input" value={sem} onChange={(event) => setSem(event.target.value)}>
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
            <option key={semester} value={semester}>Sem {semester}</option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min="0"
          max="100"
          placeholder="Min attendance"
          value={minAttendance}
          onChange={(event) => setMinAttendance(event.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          max="100"
          placeholder="Max attendance"
          value={maxAttendance}
          onChange={(event) => setMaxAttendance(event.target.value)}
        />
        <select
          className="input md:col-span-2 xl:col-span-1"
          value={leaveStatus}
          onChange={(event) => setLeaveStatus(event.target.value)}
        >
          <option value="">Any Leave Status</option>
          <option value="pending">Pending</option>
          <option value="recommended">Recommended</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : students.length === 0 ? (
        <EmptyState message="No students found" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {['Roll No', 'Name', 'Email', 'Department', 'Semester', 'Attendance', 'Leave'].map((heading) => (
                  <th key={heading} className="text-left px-4 py-3 text-neutral-500 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-neutral-600">{student.roll_no}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{student.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{student.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{student.department}</td>
                  <td className="px-4 py-3 text-neutral-600">Sem {student.semester}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {Number(student.attendance_pct ?? 0).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">
                    {student.leave_status ? (
                      <Badge label={student.leave_status} variant={student.leave_status} />
                    ) : (
                      <span className="text-neutral-400">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
