import { useState } from "react";
import { Tab, Tabs, TabTitleText } from "@patternfly/react-core";
import type { CommitInfo, PullRequestInfo, RepoJiraTicket } from "../../api/types";
import type { Quarter } from "../../utils/quarterUtils";
import WeeklyTimeline from "./WeeklyTimeline";
import PRTable from "./PRTable";
import JiraTable from "./JiraTable";

interface RepoDetailTabsProps {
  commits: CommitInfo[];
  pullRequests: PullRequestInfo[];
  jiraTickets: RepoJiraTicket[];
  jiraLoading: boolean;
  quarter: Quarter;
  selectedWeek: number | null;
}

export default function RepoDetailTabs({
  commits,
  pullRequests,
  jiraTickets,
  jiraLoading,
  quarter,
  selectedWeek,
}: RepoDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<string | number>(0);

  return (
    <Tabs
      activeKey={activeTab}
      onSelect={(_e, key) => setActiveTab(key)}
      isFilled
      style={{ marginTop: 8 }}
    >
      <Tab eventKey={0} title={<TabTitleText>Timeline</TabTitleText>}>
        <div style={{ padding: "8px 0" }}>
          <WeeklyTimeline
            commits={commits}
            quarter={quarter}
            selectedWeek={selectedWeek}
          />
        </div>
      </Tab>
      <Tab eventKey={1} title={<TabTitleText>Pull Requests ({pullRequests.length})</TabTitleText>}>
        <div style={{ padding: "8px 0" }}>
          <PRTable pullRequests={pullRequests} />
        </div>
      </Tab>
      <Tab eventKey={2} title={<TabTitleText>Jira Tickets ({jiraTickets.length})</TabTitleText>}>
        <div style={{ padding: "8px 0" }}>
          <JiraTable tickets={jiraTickets} isLoading={jiraLoading} />
        </div>
      </Tab>
    </Tabs>
  );
}
