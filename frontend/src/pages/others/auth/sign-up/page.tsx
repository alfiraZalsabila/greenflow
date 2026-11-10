import { PageMeta } from "@/components/shared/page-meta";
import SignUp from "./index";

export default function SignUpPage() {
  return (
    <>
      <PageMeta
        title="Daftar | GREENFLOW"
        description="Buat akun GREENFLOW untuk memantau lahan sawi."
      />
      <SignUp />
    </>
  );
}
