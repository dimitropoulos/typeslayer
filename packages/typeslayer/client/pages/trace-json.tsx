import { ShowFile } from "../components/show-file";

export const TraceJson = () => {
  return (
    <ShowFile
      fileName="trace.json"
      title="trace.json"
      description="This is the trace.json file created by the `--generateTrace` tsc option."
    />
  );
};
