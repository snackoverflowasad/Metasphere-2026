"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import type { PublicationStatus } from "@/types/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AdminEditionOption {
  id: string;
  year: number;
  subtitle: string;
  status: PublicationStatus;
  isActive: boolean;
}

export interface AdminEditionSwitcherProps {
  editions: AdminEditionOption[];
  selectedYear: number;
}

export function AdminEditionSwitcher({
  editions,
  selectedYear,
}: AdminEditionSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeYear = searchParams.get("edition") || String(selectedYear);

  const handleChange = (nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edition", nextValue);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-slate-400 hidden sm:block" />
      <span className="text-xs font-medium text-slate-500 hidden sm:inline">
        Edition:
      </span>
      <Select value={activeYear} onValueChange={handleChange}>
        <SelectTrigger className="w-[210px] h-8 text-xs font-medium">
          <SelectValue placeholder="Select edition" />
        </SelectTrigger>
        <SelectContent>
          {editions.map((edition) => (
            <SelectItem key={edition.id} value={String(edition.year)}>
              {edition.year} — {edition.status}
              {edition.isActive ? " (Active)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
