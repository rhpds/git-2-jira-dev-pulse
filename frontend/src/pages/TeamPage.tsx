/**
 * TeamPage - Team Collaboration Hub
 * Shared annotations, bookmarks, team members, and activity stream
 */

import { useState, useEffect } from "react";
import {
  PageSection,
  Title,
  Stack,
  StackItem,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardTitle,
  Button,
  Label,
  TextInput,
  TextArea,
  EmptyState,
  EmptyStateBody,
  Tabs,
  Tab,
  TabTitleText,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
} from "@patternfly/react-core";
import { motion } from "framer-motion";

const API_BASE = "http://localhost:9000";

interface TeamMember {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  joined_at: string | null;
}

interface Annotation {
  id: number;
  repo_path: string;
  content: string;
  type: string;
  is_resolved: boolean;
  author: string;
  created_at: string;
}

interface Bookmark {
  id: number;
  title: string;
  url: string;
  category: string | null;
  author: string;
  created_at: string;
}

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<string>("members");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Annotation form
  const [annRepoPath, setAnnRepoPath] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState("note");
  const [annTypeOpen, setAnnTypeOpen] = useState(false);

  // Bookmark form
  const [bmTitle, setBmTitle] = useState("");
  const [bmUrl, setBmUrl] = useState("");
  const [bmCategory, setBmCategory] = useState("");

  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [memRes, actRes] = await Promise.all([
        fetch(`${API_BASE}/api/team/members`, { headers }),
        fetch(`${API_BASE}/api/team/activity`, { headers }),
      ]);

      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(memData.members || []);
      }
      if (actRes.ok) {
        const actData = await actRes.json();
        setAnnotations(actData.annotations || []);
        setBookmarks(actData.bookmarks || []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createAnnotation = async () => {
    if (!annRepoPath.trim() || !annContent.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/team/annotations`, {
        method: "POST",
        headers,
        body: JSON.stringify({ repo_path: annRepoPath, content: annContent, annotation_type: annType }),
      });
      if (res.ok) {
        setAnnRepoPath("");
        setAnnContent("");
        fetchData();
      }
    } catch { /* ignore */ }
  };

  const createBookmark = async () => {
    if (!bmTitle.trim() || !bmUrl.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/team/bookmarks`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title: bmTitle, url: bmUrl, category: bmCategory || null }),
      });
      if (res.ok) {
        setBmTitle("");
        setBmUrl("");
        setBmCategory("");
        fetchData();
      }
    } catch { /* ignore */ }
  };

  const deleteBookmark = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/team/bookmarks/${id}`, { method: "DELETE", headers });
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch { /* ignore */ }
  };

  const roleColor = (role: string) => {
    if (role === "owner" || role === "admin") return "purple";
    if (role === "manager") return "blue";
    return "grey";
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h1" size="2xl">Team Collaboration</Title>
          <p style={{ color: "var(--pf-t--global--text--color--subtle)", marginTop: "0.5rem" }}>
            Shared workspace for team annotations, bookmarks, and activity
          </p>
        </StackItem>

        <StackItem>
          <Tabs activeKey={activeTab} onSelect={(_e, k) => setActiveTab(String(k))}>
            <Tab eventKey="members" title={<TabTitleText>Members ({members.length})</TabTitleText>} />
            <Tab eventKey="annotations" title={<TabTitleText>Annotations ({annotations.length})</TabTitleText>} />
            <Tab eventKey="bookmarks" title={<TabTitleText>Bookmarks ({bookmarks.length})</TabTitleText>} />
          </Tabs>
        </StackItem>

        {error && <StackItem><Label color="red">{error}</Label></StackItem>}

        {/* Members Tab */}
        {activeTab === "members" && (
          <StackItem>
            <Card>
              <CardTitle>Team Members</CardTitle>
              <CardBody>
                {members.length > 0 ? (
                  <Grid hasGutter>
                    {members.map((m) => (
                      <GridItem key={m.id} span={4}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          style={{ padding: "1rem", borderRadius: "8px", border: "1px solid var(--pf-t--global--border--color--default)" }}
                        >
                          <div style={{ fontWeight: 500, fontSize: "1rem" }}>{m.full_name || m.username}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--pf-t--global--text--color--subtle)" }}>{m.email}</div>
                          <div style={{ marginTop: "0.5rem" }}>
                            <Label isCompact color={roleColor(m.role) as "purple" | "blue" | "grey"}>{m.role}</Label>
                          </div>
                        </motion.div>
                      </GridItem>
                    ))}
                  </Grid>
                ) : (
                  <EmptyState titleText="No team members">
                    <EmptyStateBody>Join an organization to see team members.</EmptyStateBody>
                  </EmptyState>
                )}
              </CardBody>
            </Card>
          </StackItem>
        )}

        {/* Annotations Tab */}
        {activeTab === "annotations" && (
          <StackItem>
            <Stack hasGutter>
              <StackItem>
                <Card>
                  <CardTitle>Add Annotation</CardTitle>
                  <CardBody>
                    <Grid hasGutter>
                      <GridItem span={4}>
                        <TextInput
                          id="ann-repo"
                          value={annRepoPath}
                          onChange={(_e, v) => setAnnRepoPath(v)}
                          placeholder="Repo path..."
                          aria-label="Repo path"
                        />
                      </GridItem>
                      <GridItem span={2}>
                        <Select
                          id="ann-type"
                          isOpen={annTypeOpen}
                          selected={annType}
                          onSelect={(_e, v) => { setAnnType(v as string); setAnnTypeOpen(false); }}
                          onOpenChange={setAnnTypeOpen}
                          toggle={(ref) => (
                            <MenuToggle ref={ref} onClick={() => setAnnTypeOpen(!annTypeOpen)}>{annType}</MenuToggle>
                          )}
                        >
                          <SelectList>
                            <SelectOption value="note">Note</SelectOption>
                            <SelectOption value="warning">Warning</SelectOption>
                            <SelectOption value="todo">Todo</SelectOption>
                            <SelectOption value="review">Review</SelectOption>
                          </SelectList>
                        </Select>
                      </GridItem>
                      <GridItem span={4}>
                        <TextArea
                          id="ann-content"
                          value={annContent}
                          onChange={(_e, v) => setAnnContent(v)}
                          placeholder="Annotation content..."
                          aria-label="Annotation content"
                          rows={2}
                        />
                      </GridItem>
                      <GridItem span={2}>
                        <Button variant="primary" onClick={createAnnotation} isDisabled={!annRepoPath.trim() || !annContent.trim()}>
                          Add
                        </Button>
                      </GridItem>
                    </Grid>
                  </CardBody>
                </Card>
              </StackItem>
              <StackItem>
                <Card>
                  <CardTitle>Recent Annotations</CardTitle>
                  <CardBody>
                    {annotations.length > 0 ? annotations.map((ann) => (
                      <div key={ann.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <Label isCompact color={ann.type === "warning" ? "orange" : ann.type === "todo" ? "blue" : "grey"}>{ann.type}</Label>
                            <code style={{ fontSize: "0.8rem" }}>{ann.repo_path}</code>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                            {ann.author} - {new Date(ann.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.875rem", marginLeft: "0.25rem" }}>{ann.content}</div>
                      </div>
                    )) : (
                      <div style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                        No annotations yet
                      </div>
                    )}
                  </CardBody>
                </Card>
              </StackItem>
            </Stack>
          </StackItem>
        )}

        {/* Bookmarks Tab */}
        {activeTab === "bookmarks" && (
          <StackItem>
            <Stack hasGutter>
              <StackItem>
                <Card>
                  <CardTitle>Add Bookmark</CardTitle>
                  <CardBody>
                    <Grid hasGutter>
                      <GridItem span={3}>
                        <TextInput id="bm-title" value={bmTitle} onChange={(_e, v) => setBmTitle(v)} placeholder="Title..." aria-label="Bookmark title" />
                      </GridItem>
                      <GridItem span={4}>
                        <TextInput id="bm-url" value={bmUrl} onChange={(_e, v) => setBmUrl(v)} placeholder="URL..." aria-label="Bookmark URL" />
                      </GridItem>
                      <GridItem span={3}>
                        <TextInput id="bm-cat" value={bmCategory} onChange={(_e, v) => setBmCategory(v)} placeholder="Category..." aria-label="Category" />
                      </GridItem>
                      <GridItem span={2}>
                        <Button variant="primary" onClick={createBookmark} isDisabled={!bmTitle.trim() || !bmUrl.trim()}>
                          Add
                        </Button>
                      </GridItem>
                    </Grid>
                  </CardBody>
                </Card>
              </StackItem>
              <StackItem>
                <Card>
                  <CardTitle>Team Bookmarks</CardTitle>
                  <CardBody>
                    {bookmarks.length > 0 ? bookmarks.map((bm) => (
                      <div key={bm.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--pf-t--global--border--color--default)" }}>
                        <div>
                          <a href={bm.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 500 }}>{bm.title}</a>
                          {bm.category && <Label isCompact style={{ marginLeft: "0.5rem" }}>{bm.category}</Label>}
                          <div style={{ fontSize: "0.75rem", color: "var(--pf-t--global--text--color--subtle)" }}>
                            by {bm.author}
                          </div>
                        </div>
                        <Button variant="plain" size="sm" onClick={() => deleteBookmark(bm.id)}>
                          {"\u2715"}
                        </Button>
                      </div>
                    )) : (
                      <div style={{ color: "var(--pf-t--global--text--color--subtle)", textAlign: "center", padding: "2rem" }}>
                        No bookmarks yet
                      </div>
                    )}
                  </CardBody>
                </Card>
              </StackItem>
            </Stack>
          </StackItem>
        )}

        {loading && (
          <StackItem>
            <div style={{ textAlign: "center", padding: "2rem" }}>Loading team data...</div>
          </StackItem>
        )}
      </Stack>
    </PageSection>
  );
}
