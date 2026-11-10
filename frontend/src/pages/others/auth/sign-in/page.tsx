import { PageMeta } from "@/components/shared/page-meta";
import SignIn from "./index";

export default function SignInPage() {
  return (
    <>
      <PageMeta
        title="Masuk | GREENFLOW"
        description="Masuk ke panel GREENFLOW untuk memantau lahan sawi."
      />
      <SignIn />
    </>
  );
}
