"use client";

import { type BrowserTab, callExtension } from "@/lib/extension-bridge";
import { MAX_GROUP_LINKS, TAB_GROUPS_KEY, parseTabGroups, type TabGroup, type TabGroupLink } from "@/lib/tab-groups";
import { usePersistentState } from "@/lib/use-persistent-state";

/** Espacios guardados (sincronizados entre pestañas y componentes). */
export function useWorkspaces() {
  return usePersistentState<TabGroup[]>(TAB_GROUPS_KEY, { initial: [], parse: parseTabGroups });
}

function toLinks(tabs: BrowserTab[]): TabGroupLink[] {
  return tabs.slice(0, MAX_GROUP_LINKS).map(({ url, title }) => ({ url, title }));
}

/**
 * Abre el espacio como grupo nativo en una ventana nueva. Si ya está abierto
 * (hay un grupo con ese nombre), lleva a ese grupo en vez de duplicarlo.
 */
export async function openWorkspace(workspace: TabGroup): Promise<{ reused: boolean; opened: number }> {
  const result = await callExtension<{ ok: boolean; reused?: boolean; opened: number }>("openTabGroup", {
    name: workspace.name,
    color: workspace.color,
    urls: workspace.links.map((link) => link.url),
    reuse: true,
  });
  return { reused: Boolean(result.reused), opened: result.opened };
}

/** Pestañas actuales del espacio si está abierto como grupo, o null. */
export async function readOpenWorkspaceTabs(workspace: TabGroup): Promise<TabGroupLink[] | null> {
  const { found, tabs } = await callExtension<{ found: boolean; tabs: BrowserTab[] }>("getGroupTabs", {
    name: workspace.name,
  });
  return found ? toLinks(tabs) : null;
}

export async function readCurrentWindowTabs(): Promise<BrowserTab[]> {
  const { tabs } = await callExtension<{ tabs: BrowserTab[] }>("getCurrentWindowTabs");
  return tabs;
}

export async function closeWorkspaceTabs(workspace: TabGroup): Promise<number> {
  const { closed } = await callExtension<{ closed: number }>("closeGroup", { name: workspace.name });
  return closed;
}
