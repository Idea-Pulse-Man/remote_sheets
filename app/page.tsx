import JobsLayout from "./jobs-layout";
import JobsAppliedPage from "./jobs-applied";

export default function Home() {
  return (
    <JobsLayout>
      <JobsAppliedPage />
    </JobsLayout>
  );
}
