// import { ChevronLeftIcon } from "@/icons";
import { cn } from "@/utils";
import { Link } from "react-router";
import SignInFormFields from "./form";
import SignInHeader from "./header";

export default function SignIn() {
  return (
    <div className={cn("flex w-full flex-1 flex-col lg:w-1/2")}>
      {/* <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="rtl:rotate-180" />
          Kembali ke dashboard
        </Link>
      </div> */}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <SignInHeader />

          <div>
            <SignInFormFields />

            <div className="mt-5">
              <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
                Belum punya akun?{" "}
                <Link
                  to="/signup"
                  className="text-brand-600 hover:text-brand-700 dark:text-brand-300"
                >
                  Daftar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
