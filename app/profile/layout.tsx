import JobsLayout from "../jobs-layout";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <JobsLayout>{children}</JobsLayout>;
}
