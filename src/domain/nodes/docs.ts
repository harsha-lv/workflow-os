export type NodeGuide = {
  example: string;
  mistakes: string[];
};

export const nodeGuides: Record<string, NodeGuide> = {
  "webhook.trigger": {
    example: "POST JSON to the workflow webhook URL. The body is available as trigger.body.",
    mistakes: ["Publishing is required before the URL accepts production traffic.", "Do not store secrets in query strings."],
  },
  "manual.trigger": {
    example: "Use Test with sample JSON. The payload becomes trigger.",
    mistakes: ["An empty sample makes downstream expressions resolve to blank."],
  },
  "ai.classifier": {
    example: "Labels: qualified, nurture, disqualified. Branch with a Condition on nodes.<id>.label.",
    mistakes: ["Referencing a label that is not in the list.", "Forgetting JSON mode is on — read .label not the raw text."],
  },
  "ai.prompt": {
    example: "Prompt: Write a reply for {{nodes.extract.name}} at {{nodes.extract.company}}.",
    mistakes: ["Leaving the prompt empty.", "Putting API keys in the prompt."],
  },
  "data.http": {
    example: "POST https://api.example.com/v1/leads with body {{nodes.extract}}.",
    mistakes: ["Missing URL.", "No error policy on a flaky endpoint."],
  },
  "logic.condition": {
    example: "nodes.classify.label == \"qualified\" && nodes.classify.confidence >= 0.7",
    mistakes: ["Using = instead of ==.", "Referencing a node that is not upstream."],
  },
  "human.approval": {
    example: "Pauses the run. Approve from the inbox to resume the approved branch.",
    mistakes: ["No timeout, so the run can wait indefinitely."],
  },
  "comm.email": {
    example: "to: {{nodes.extract.email}} — queues outbound mail; connect a provider to deliver.",
    mistakes: ["Empty recipient.", "Sending before human approval on customer-facing copy."],
  },
  "ai.summarizer": {
    example: "Input {{trigger.body.message}}. Output is a short summary you can notify or log.",
    mistakes: ["Summarizing an empty body.", "Expecting the original email instead of nodes.<id>.summary."],
  },
  "ai.extractor": {
    example: "Schema { name, email, company }. Read nodes.<id>.email downstream.",
    mistakes: ["Referencing a field that is not in the schema."],
  },
  "ai.agent": {
    example: "Goal: {{trigger.question}}. The result is nodes.<id>.result.",
    mistakes: ["Leaving the goal blank."],
  },
  "comm.notification": {
    example: "Title and message appear in the workspace. No external send until a provider is connected.",
    mistakes: ["Assuming Slack is connected when the adapter is still disconnected."],
  },
  "output.log": {
    example: "Writes a message into the run inspector. Safe for tests.",
    mistakes: ["Using a log node as if it sent an email."],
  },
};

export function guideFor(type: string): NodeGuide {
  return (
    nodeGuides[type] ?? {
      example: "Configure the required fields, then Test with sample data.",
      mistakes: ["Leaving required fields blank.", "Connecting this node after an unreachable branch."],
    }
  );
}
