"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CommitteeSnapshot } from "@/types/database";

export interface CommitteeDirectoryProps {
  committee: CommitteeSnapshot;
}

type NationalityFilter = "all" | "national" | "international";

export function CommitteeDirectory({ committee }: CommitteeDirectoryProps) {
  const [nationalityFilter, setNationalityFilter] =
    useState<NationalityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number | "all">("all");

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return committee.members.filter((m) => {
      if (
        nationalityFilter !== "all" &&
        m.nationalityGroup !== nationalityFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.affiliation.toLowerCase().includes(q) ||
        m.roleLabel.toLowerCase().includes(q)
      );
    });
  }, [committee.members, nationalityFilter, searchQuery]);

  // Scientific committee uses role/leadership card groups when role labels exist
  if (committee.category === "scientific") {
    const groups = new Map<string, typeof filteredMembers>();
    for (const member of filteredMembers) {
      const groupKey =
        member.groupName || member.roleLabel || "Scientific Committee Members";
      const list = groups.get(groupKey) ?? [];
      list.push(member);
      groups.set(groupKey, list);
    }

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 bg-orange-50/60 rounded-xl border border-orange-100">
          <div
            id="nationality-toggle"
            className="flex items-center rounded-lg shadow-sm bg-white border border-gray-300 text-sm font-semibold"
          >
            <button
              type="button"
              id="allBtn"
              onClick={() => setNationalityFilter("all")}
              className={`px-4 py-2 rounded-l-md transition-colors cursor-pointer ${
                nationalityFilter === "all"
                  ? "bg-[#f97316] text-white"
                  : "text-gray-700 hover:bg-orange-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              id="nationalBtn"
              onClick={() => setNationalityFilter("national")}
              className={`px-4 py-2 border-l border-r transition-colors cursor-pointer ${
                nationalityFilter === "national"
                  ? "bg-[#f97316] text-white"
                  : "text-gray-700 hover:bg-orange-50"
              }`}
            >
              National <span className="font-normal">(জাতীয়)</span>
            </button>
            <button
              type="button"
              id="internationalBtn"
              onClick={() => setNationalityFilter("international")}
              className={`px-4 py-2 rounded-r-md transition-colors cursor-pointer ${
                nationalityFilter === "international"
                  ? "bg-[#f97316] text-white"
                  : "text-gray-700 hover:bg-orange-50"
              }`}
            >
              International <span className="font-normal">(আন্তর্জাতিক)</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              aria-label="Search committee members"
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 bg-white shadow-sm text-sm focus:border-[#f97316] focus:outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from(groups.entries()).map(([groupTitle, members]) => (
            <div
              key={groupTitle}
              className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {groupTitle}
              </h2>
              <ul className="space-y-3 text-gray-600">
                {members.map((member) => (
                  <li key={member.id}>
                    <span className="font-medium text-gray-800">
                      {member.fullName}
                    </span>
                    {member.affiliation && (
                      <>
                        <br />
                        <small className="text-gray-500">
                          {member.affiliation}
                        </small>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayedMembers =
    pageSize === "all" ? filteredMembers : filteredMembers.slice(0, pageSize);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center mb-6 p-4 bg-orange-50/50 rounded-lg">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
            <label htmlFor="customLength">Show</label>
            <select
              id="customLength"
              value={String(pageSize)}
              onChange={(e) => {
                const v = e.target.value;
                setPageSize(v === "all" ? "all" : Number(v));
              }}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 shadow-sm focus:border-[#f97316] focus:outline-none"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="all">All</option>
            </select>
            <span>Entries</span>
          </div>

          <div
            id="nationality-toggle"
            className="flex items-center rounded-lg shadow-sm bg-white border border-gray-300 text-sm font-semibold"
          >
            <button
              type="button"
              id="allBtn"
              onClick={() => setNationalityFilter("all")}
              className={`px-4 py-2 rounded-l-md transition-colors cursor-pointer ${
                nationalityFilter === "all"
                  ? "bg-[#f97316] text-white"
                  : "text-gray-700 hover:bg-orange-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              id="nationalBtn"
              onClick={() => setNationalityFilter("national")}
              className={`px-4 py-2 border-l border-r transition-colors cursor-pointer ${
                nationalityFilter === "national"
                  ? "bg-[#f97316] text-white"
                  : "text-gray-700 hover:bg-orange-50"
              }`}
            >
              National <span className="font-normal">(জাতীয়)</span>
            </button>
            <button
              type="button"
              id="internationalBtn"
              onClick={() => setNationalityFilter("international")}
              className={`px-4 py-2 rounded-r-md transition-colors cursor-pointer ${
                nationalityFilter === "international"
                  ? "bg-[#f97316] text-white"
                  : "text-gray-700 hover:bg-orange-50"
              }`}
            >
              International <span className="font-normal">(আন্তর্জাতিক)</span>
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            id="customSearch"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            aria-label="Filter committee members"
            className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 bg-white shadow-sm text-sm focus:border-[#f97316] focus:outline-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="rounded-xl overflow-x-auto border border-gray-200">
        <table id="committeeTable" className="w-full text-left text-sm">
          <thead className="bg-orange-50 text-orange-900">
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Affiliation</th>
              <th className="p-4 font-semibold">Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayedMembers.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">
                  No committee members match the current filter.
                </td>
              </tr>
            ) : (
              displayedMembers.map((member) => (
                <tr key={member.id} className="hover:bg-orange-50/40">
                  <td className="p-4 font-medium text-gray-900">
                    {member.fullName}
                  </td>
                  <td className="p-4 text-gray-700">{member.affiliation}</td>
                  <td className="p-4">
                    <span
                      className={
                        member.nationalityGroup === "national"
                          ? "inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
                          : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                      }
                    >
                      {member.nationalityGroup === "national"
                        ? "India (National)"
                        : "International"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Showing {displayedMembers.length} of {filteredMembers.length} matching
        members
      </p>
    </div>
  );
}
