"use client";

import { useState } from "react";
import { Select } from "@/components/forms";
import { DuesMemberPicker, type PickableMember } from "@/components/finance/dues-member-picker";

const SCOPE_OPTIONS = [
  { value: "all", label: "All active members" },
  { value: "department", label: "Members of a specific department" },
  { value: "custom", label: "Select members individually" },
];

export function DuesScopeFields({
  departments,
  members,
  defaultScope = "all",
  defaultDepartmentId,
}: {
  departments: Array<{ value: string; label: string }>;
  members: PickableMember[];
  defaultScope?: string;
  defaultDepartmentId?: string;
}) {
  const [scope, setScope] = useState(defaultScope);

  return (
    <div className="space-y-4">
      <div>
        <label className="field-label" htmlFor="scope">Who this applies to</label>
        <select
          id="scope"
          name="scope"
          className="field"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          {SCOPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {scope === "department" && departments.length ? (
        <Select
          label="Department"
          name="department_id"
          options={departments}
          defaultValue={defaultDepartmentId}
          required
        />
      ) : null}

      {scope === "custom" ? <DuesMemberPicker members={members} /> : null}
    </div>
  );
}
