import { SearchIcon } from "lucide-react";
import { LoaderIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

export default function SearchStatus({ searching }: { searching?: boolean }) {
  const { pending } = useFormStatus();

  //isSearching is true when the router is is transition, otherwise is pending when the form is submitting
  const isSearching = searching || pending;

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2">
      {isSearching ? (
        <div aria-label="searching..." className="h-fit w-fit animate-spin">
          <LoaderIcon
            aria-hidden="true"
            width={16}
            height={16}
            className="text-gray-500"
          />
        </div>
      ) : (
        <SearchIcon
          aria-hidden="true"
          width={16}
          height={16}
          className="text-gray-500"
        />
      )}
    </div>
  );
}
