"use client";

import { useState } from "react";
import { Contact, Segment } from "@/lib/services";
import {
  Users,
  Search,
  Filter,
  Layers,
  Kanban,
  Table as TableIcon,
  Plus,
  Pencil,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { notifyToast } from "@/lib/toast";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export default function CRMView({
  initialContacts,
  segments,
  role,
}: {
  initialContacts: Contact[];
  segments: Segment[];
  role: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTags, setContactTags] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
  const isViewer = role === "viewer";

  // Filtering
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesTag =
      selectedTag === "all" || (c.tags && c.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  // Unique tags
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags || [])));

  // Grouped for pipeline
  const pipelineStatuses: Array<{ key: Contact["status"]; label: string; tagClass: string }> = [
    { key: "lead", label: "New Leads", tagClass: "border-stone-400 bg-stone-100 text-stone-800" },
    { key: "qualified", label: "Qualified", tagClass: "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]" },
    { key: "customer", label: "Customers", tagClass: "border-[#CCD8CD] bg-[#EDF2EE] text-[#4A5D4E]" },
    { key: "lost", label: "Closed / Lost", tagClass: "border-stone-300 bg-stone-200/50 text-stone-600" },
  ];

  function beginCreateContact() {
    setEditingContact(null);
    setContactName("");
    setContactEmail("");
    setContactTags("");
    setContactError(null);
    setShowContactForm(true);
  }

  function beginEditContact(contact: Contact) {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactEmail(contact.email);
    setContactTags((contact.tags || []).join(", "));
    setContactError(null);
    setShowContactForm(true);
  }

  async function saveContact(event: React.FormEvent) {
    event.preventDefault();
    setSavingContact(true);
    setContactError(null);
    const tags = contactTags.split(",").map((tag) => tag.trim()).filter(Boolean);
    try {
      const response = await fetch(
        editingContact ? `/api/contacts/${editingContact.id}` : "/api/contacts",
        {
          method: editingContact ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingContact
            ? { name: contactName, email: contactEmail, tags, status: editingContact.status }
            : { name: contactName, email: contactEmail, tags })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save contact.");
      setContacts((current) => editingContact
        ? current.map((contact) => contact.id === editingContact.id ? data : contact)
        : [data, ...current]);
      setShowContactForm(false);
      notifyToast("success", editingContact ? "Contact updated." : "Lead created.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save contact.";
      setContactError(message);
      notifyToast("error", message);
    } finally {
      setSavingContact(false);
    }
  }

  async function changeStage(contact: Contact, status: Contact["status"]) {
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: contact.name, email: contact.email, tags: contact.tags || [], status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to change stage.");
      setContacts((current) => current.map((item) => item.id === data.id ? data : item));
      notifyToast("success", `Moved ${contact.name} to ${status}.`);
    } catch (error) {
      notifyToast("error", error instanceof Error ? error.message : "Unable to change stage.");
    }
  }

  function exportContacts() {
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      "name,email,tags,status,source,created_at",
      ...filteredContacts.map((contact) =>
        [contact.name, contact.email, (contact.tags || []).join("|"), contact.status, contact.source, contact.created_at]
          .map(quote).join(",")
      )
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nexus-contacts.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importContacts(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    setImportFeedback(null);
    try {
      const rows = parseCsv(await file.text());
      const headers = rows.shift()?.map((header) => header.trim().toLowerCase()) || [];
      const nameIndex = headers.indexOf("name");
      const emailIndex = headers.indexOf("email");
      const tagsIndex = headers.indexOf("tags");
      if (nameIndex < 0 || emailIndex < 0) {
        throw new Error("CSV must include name and email columns.");
      }
      if (rows.length > 500) {
        throw new Error("Import is limited to 500 contacts per file.");
      }

      const imported: Contact[] = [];
      let failed = 0;
      for (let start = 0; start < rows.length; start += 10) {
        const chunk = rows.slice(start, start + 10);
        const results = await Promise.all(chunk.map(async (row) => {
          const response = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: row[nameIndex]?.trim() || "",
              email: row[emailIndex]?.trim() || "",
              tags: tagsIndex < 0
                ? []
                : (row[tagsIndex] || "").split(/[|;]/).map((tag) => tag.trim()).filter(Boolean)
            })
          });
          const data = await response.json();
          if (!response.ok) return { error: data.error || "Invalid contact row." };
          return { contact: data as Contact };
        }));
        for (const result of results) {
          if (result.contact) imported.push(result.contact);
          else failed += 1;
        }
      }

      setContacts((current) => [...imported, ...current]);
      const feedback = `Imported ${imported.length} contact${imported.length === 1 ? "" : "s"}; ${failed} row${failed === 1 ? "" : "s"} skipped.`;
      setImportFeedback(feedback);
      notifyToast(failed ? "error" : "success", feedback);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import contacts.";
      setImportFeedback(message);
      notifyToast("error", message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-300">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-semibold mb-1">
            Audience Intelligence & Stage Management
          </div>
          {importFeedback && <p role="status" className="text-xs font-mono text-stone-600">{importFeedback}</p>}
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            CRM Directory & Pipeline
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Segment customer cohorts, inspect contact touchpoints, and advance deal progression.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={exportContacts} className="flex items-center gap-2 border border-stone-300 bg-white px-3 py-2 text-xs font-mono uppercase">
          <Download aria-hidden="true" className="h-3.5 w-3.5" /> Export CSV
        </button>
        <label className={cn("flex items-center gap-2 border border-stone-300 bg-white px-3 py-2 text-xs font-mono uppercase", isViewer || importing ? "cursor-not-allowed opacity-50" : "cursor-pointer")} title={isViewer ? "Read-only access" : "CSV requires name and email columns; optional tags column accepts | or ; separators."}>
          {importing ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Upload aria-hidden="true" className="h-3.5 w-3.5" />} Import CSV
          <input type="file" accept=".csv,text/csv" disabled={isViewer || importing} onChange={importContacts} className="sr-only" />
        </label>
        <button type="button" onClick={beginCreateContact} disabled={isViewer} title={isViewer ? "Read-only access" : undefined} className="flex items-center gap-2 border border-stone-900 bg-[#C85A32] px-3 py-2 text-xs font-mono uppercase text-white disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500">
          <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add Contact
        </button>
        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-200 border border-stone-300 rounded-none">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer",
              viewMode === "table"
                ? "bg-white text-stone-900 shadow-[1px_1px_0px_0px_#1C1917] border border-stone-900"
                : "text-stone-600 hover:text-stone-900 border border-transparent"
            )}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode("pipeline")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer",
              viewMode === "pipeline"
                ? "bg-white text-stone-900 shadow-[1px_1px_0px_0px_#1C1917] border border-stone-900"
                : "text-stone-600 hover:text-stone-900 border border-transparent"
            )}
          >
            <Kanban className="w-3.5 h-3.5" />
            Pipeline
          </button>
        </div>
        </div>
      </div>

      {/* Segments Cards Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {segments.map((seg) => {
          const matchCount = contacts.filter((c) => c.tags?.includes(seg.filter_tag)).length;
          const isSelected = selectedTag === seg.filter_tag;
          return (
            <button
              type="button"
              key={seg.id}
              aria-pressed={isSelected}
              onClick={() => setSelectedTag(isSelected ? "all" : seg.filter_tag)}
              className={cn(
                "p-4 rounded-none border transition-all cursor-pointer flex items-center justify-between",
                isSelected
                  ? "bg-[#FDF5F1] border-stone-900 shadow-[3px_3px_0px_0px_#1C1917]"
                  : "bg-white border-stone-300 hover:border-stone-900 shadow-[2px_2px_0px_0px_#1C1917]"
              )}
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#C85A32]" /> Segment
                </div>
                <div className="font-serif text-base font-bold text-stone-900 mt-0.5">{seg.name}</div>
                <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                  Tag filter: <span className="text-stone-900 font-bold font-mono">[{seg.filter_tag}]</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-serif text-2xl font-bold text-stone-900">{matchCount}</span>
                <div className="text-[9px] font-mono uppercase text-stone-500">Records</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls: Search & Tag Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contact name or email..."
            className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-stone-300 rounded-none text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-mono text-stone-500 flex items-center gap-1 uppercase tracking-wider">
            <Filter className="w-3 h-3" /> Tag:
          </span>
          <button
            onClick={() => setSelectedTag("all")}
            className={cn(
              "px-2.5 py-1 rounded-none text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border",
              selectedTag === "all"
                ? "bg-stone-900 text-white border-stone-900 shadow-[1px_1px_0px_0px_#1C1917]"
                : "bg-white text-stone-600 border-stone-300 hover:border-stone-900"
            )}
          >
            All ({contacts.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={cn(
                "px-2.5 py-1 rounded-none text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border",
                selectedTag === tag
                  ? "bg-[#C85A32] text-white border-[#C85A32] shadow-[1px_1px_0px_0px_#1C1917]"
                  : "bg-white text-stone-600 border-stone-300 hover:border-stone-900"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main View Mode: Table vs Pipeline */}
      {viewMode === "table" ? (
        <div className="rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F2EB] border-b border-stone-300 text-stone-600 uppercase font-mono tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-5">Contact</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Tags</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Source</th>
                  <th className="py-3 px-5">Added</th>
                  <th className="py-3 px-5">Stage</th>
                  <th className="py-3 px-5">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-400 font-mono">
                      No contacts found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-5 font-bold text-stone-900 font-serif text-sm">
                        {contact.name}
                      </td>
                      <td className="py-3 px-5 text-stone-600 font-mono text-[11px]">
                        {contact.email}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags?.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded-none text-[9px] font-mono uppercase bg-stone-100 text-stone-700 border border-stone-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase tracking-wider border",
                            contact.status === "customer" && "bg-[#EDF2EE] text-[#4A5D4E] border-[#CCD8CD]",
                            contact.status === "qualified" && "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
                            contact.status === "lead" && "bg-stone-100 text-stone-800 border-stone-300",
                            contact.status === "lost" && "bg-stone-200 text-stone-600 border-stone-300"
                          )}
                        >
                          {contact.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-stone-500 font-mono text-[11px] capitalize">
                        {contact.source.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-5 text-stone-500 font-mono text-[11px]">
                        {formatDate(contact.created_at)}
                      </td>
                      <td className="py-3 px-5">
                        <select aria-label={`Stage for ${contact.name}`} value={contact.status} disabled={isViewer} onChange={(event) => changeStage(contact, event.target.value as Contact["status"])} className="border border-stone-300 bg-white px-2 py-1 text-[10px] uppercase disabled:opacity-60">
                          {pipelineStatuses.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-5">
                        <button type="button" disabled={isViewer} aria-label={`Edit ${contact.name}`} onClick={() => beginEditContact(contact)} className="border border-stone-300 bg-white p-1.5 disabled:opacity-50">
                          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pipeline Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {pipelineStatuses.map((stage) => {
            const stageContacts = filteredContacts.filter((c) => c.status === stage.key);
            return (
              <div
                key={stage.key}
                className="p-4 rounded-none bg-white border border-stone-300 shadow-[2px_2px_0px_0px_#1C1917] flex flex-col h-[600px]"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-bold text-stone-900">
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-stone-100 text-stone-800 px-2 py-0.5 border border-stone-300">
                    {stageContacts.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                  <div
                    aria-label={`Drop contacts into ${stage.label}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const contact = contacts.find((item) => item.id === draggedContactId);
                      if (contact && contact.status !== stage.key && !isViewer) {
                        void changeStage(contact, stage.key);
                      }
                      setDraggedContactId(null);
                    }}
                    className="min-h-8 border border-dashed border-stone-300 px-2 py-1 text-[9px] font-mono uppercase text-stone-400"
                  >
                    Drop here to move to {stage.label}
                  </div>
                  {stageContacts.map((contact) => (
                    <div
                      key={contact.id}
                      draggable={!isViewer}
                      onDragStart={() => setDraggedContactId(contact.id)}
                      onDragEnd={() => setDraggedContactId(null)}
                      className="p-3 rounded-none bg-[#FAF8F5] border border-stone-300 hover:border-stone-900 shadow-[1px_1px_0px_0px_#D6D3D1] space-y-1.5 transition-all"
                    >
                      <div className="font-serif text-xs font-bold text-stone-900">{contact.name}</div>
                      <div className="text-[11px] text-stone-500 font-mono truncate">
                        {contact.email}
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {contact.tags?.map((t) => (
                          <span
                            key={t}
                            className="px-1 py-0.2 rounded-none text-[8px] font-mono uppercase bg-white text-stone-600 border border-stone-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <label className="block pt-2">
                        <span className="sr-only">Move {contact.name} to stage</span>
                        <select aria-label={`Stage for ${contact.name}`} value={contact.status} disabled={isViewer} onChange={(event) => changeStage(contact, event.target.value as Contact["status"])} className="w-full border border-stone-300 bg-white px-2 py-1 text-[10px] uppercase disabled:opacity-60">
                          {pipelineStatuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showContactForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4">
          <form onSubmit={saveContact} className="w-full max-w-lg space-y-4 border border-stone-900 bg-white p-6 shadow-[6px_6px_0px_0px_#1C1917]">
            <h2 className="font-serif text-xl font-bold">{editingContact ? "Edit Contact" : "Create CRM Lead"}</h2>
            {contactError && <p role="alert" className="border border-[#FCA5A5] bg-[#FDF2F2] p-3 text-xs text-[#991B1B]">{contactError}</p>}
            <label className="block text-xs font-mono uppercase">Name<input required minLength={2} maxLength={100} value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-1 w-full border border-stone-300 bg-[#FAF8F5] px-3 py-2 text-sm normal-case" /></label>
            <label className="block text-xs font-mono uppercase">Email<input required type="email" maxLength={254} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-1 w-full border border-stone-300 bg-[#FAF8F5] px-3 py-2 text-sm normal-case" /></label>
            <label className="block text-xs font-mono uppercase">Tags (comma separated)<input value={contactTags} onChange={(event) => setContactTags(event.target.value)} className="mt-1 w-full border border-stone-300 bg-[#FAF8F5] px-3 py-2 text-sm normal-case" /></label>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowContactForm(false)} className="border border-stone-300 px-4 py-2 text-xs font-mono uppercase">Cancel</button>
              <button type="submit" disabled={savingContact} className="flex items-center gap-2 border border-stone-900 bg-[#C85A32] px-4 py-2 text-xs font-mono uppercase text-white disabled:opacity-50">{savingContact && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editingContact ? "Save Contact" : "Create Lead"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
