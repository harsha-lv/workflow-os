export const START_EXAMPLES = [
  {
    label: "Process incoming customer emails",
    prompt:
      "When I receive a customer email, summarize it, classify its urgency, and notify my team when it is urgent.",
  },
  {
    label: "Qualify new leads",
    prompt:
      "When a new lead arrives, extract contact details, score the lead, and hold high-value leads for human review.",
  },
  {
    label: "Summarize documents",
    prompt: "Extract key fields from a document, validate them, and send incomplete items to review.",
  },
  {
    label: "Send notifications when something changes",
    prompt: "When something changes, summarize the event and notify the workspace.",
  },
  {
    label: "Create a research workflow",
    prompt: "Take a research question, gather a brief, and return a source-aware summary.",
  },
] as const;
