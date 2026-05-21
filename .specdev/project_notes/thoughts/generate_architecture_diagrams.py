#!/usr/bin/env python3
"""Generate architecture diagrams for the Ripplegraph architecture note."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch


OUT_DIR = Path(__file__).resolve().parent / "assets"
OUT_DIR.mkdir(parents=True, exist_ok=True)


COLORS = {
    "ink": "#18212f",
    "muted": "#566276",
    "line": "#8ca0b8",
    "blue": "#dcecff",
    "green": "#dcf7e7",
    "yellow": "#fff2cc",
    "red": "#ffe0df",
    "purple": "#eadfff",
    "gray": "#eef2f6",
    "white": "#ffffff",
}


def setup(title: str, width: float = 12, height: float = 7):
    fig, ax = plt.subplots(figsize=(width, height), dpi=180)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    ax.text(
        0.03,
        0.96,
        title,
        fontsize=17,
        weight="bold",
        color=COLORS["ink"],
        va="top",
    )
    return fig, ax


def box(ax, xy, wh, title, body="", color="gray", fontsize=10):
    x, y = xy
    w, h = wh
    patch = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle="round,pad=0.012,rounding_size=0.015",
        linewidth=1.2,
        edgecolor=COLORS["line"],
        facecolor=COLORS[color],
    )
    ax.add_patch(patch)
    ax.text(x + 0.02, y + h - 0.035, title, fontsize=fontsize + 1, weight="bold", color=COLORS["ink"], va="top")
    if body:
        ax.text(
            x + 0.02,
            y + h - 0.085,
            body,
            fontsize=fontsize,
            color=COLORS["muted"],
            va="top",
            linespacing=1.25,
        )
    return patch


def arrow(ax, start, end, text=None, rad=0.0):
    patch = FancyArrowPatch(
        start,
        end,
        arrowstyle="-|>",
        mutation_scale=13,
        linewidth=1.4,
        color=COLORS["line"],
        connectionstyle=f"arc3,rad={rad}",
    )
    ax.add_patch(patch)
    if text:
        mx = (start[0] + end[0]) / 2
        my = (start[1] + end[1]) / 2
        ax.text(mx, my + 0.018, text, fontsize=8.5, color=COLORS["muted"], ha="center")


def save(fig, name: str):
    fig.savefig(OUT_DIR / name, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def architecture_layers():
    fig, ax = setup("Ripplegraph layer model")

    box(ax, (0.08, 0.73), (0.84, 0.13), "Host agent", "Claude Code, Codex, OpenCode, or another driver.\nDoes language work inside node contracts.", "blue")
    box(ax, (0.08, 0.54), (0.84, 0.13), "Consumer CLI", "SpecDev, Oceanshed, Oceanlive, or a custom coach CLI.\nPresents protocol commands and project-specific UX.", "green")
    box(ax, (0.08, 0.35), (0.84, 0.13), "Ripplegraph runtime", "Validates schemas, owns run state, enforces gates,\nresolves transitions, and serves recovery context.", "yellow")
    box(ax, (0.08, 0.16), (0.38, 0.13), "Graph repository", ".ripplegraph/graphs/* packages: dispatcher,\nworkflow, callable definitions and docs.", "purple")
    box(ax, (0.54, 0.16), (0.38, 0.13), "Durable state", "current.json, run checkpoints,\ntransition logs, artifacts.", "red")

    arrow(ax, (0.5, 0.73), (0.5, 0.67), "commands")
    arrow(ax, (0.5, 0.54), (0.5, 0.48), "API calls")
    arrow(ax, (0.34, 0.35), (0.27, 0.29), "loads")
    arrow(ax, (0.66, 0.35), (0.73, 0.29), "persists")
    save(fig, "architecture_layers.png")


def graph_kinds():
    fig, ax = setup("Graph kinds and invocation boundaries")

    box(ax, (0.06, 0.58), (0.25, 0.22), "dispatcher", "Front door for user intent.\nReturns structured action:\nstart, resume, switch,\nlist, ask, call.", "blue")
    box(ax, (0.38, 0.58), (0.25, 0.22), "workflow", "Durable run.\nCurrent node, checkpoint,\ngates, history,\nsuspend/resume.", "green")
    box(ax, (0.70, 0.58), (0.25, 0.22), "callable", "Typed graph-shaped\nfunction. May transition\ninternally, returns output\nwithout caller side effects.", "purple")

    box(ax, (0.20, 0.23), (0.24, 0.18), "Registry", "Graph package metadata:\nkind, activationHints,\nschemas, effects.", "gray")
    box(ax, (0.56, 0.23), (0.24, 0.18), "Runtime validation", "Only accepted actions\ncan create, resume,\nor call graph runs.", "yellow")

    arrow(ax, (0.31, 0.68), (0.38, 0.68), "start_run")
    arrow(ax, (0.63, 0.66), (0.70, 0.66), "call_graph")
    arrow(ax, (0.83, 0.58), (0.63, 0.41), "result", rad=-0.18)
    arrow(ax, (0.32, 0.58), (0.32, 0.41), "declares")
    arrow(ax, (0.68, 0.58), (0.68, 0.41), "checks")
    arrow(ax, (0.44, 0.32), (0.56, 0.32), "catalog")
    save(fig, "graph_kinds.png")


def command_loop():
    fig, ax = setup("Normal host-agent command loop")

    box(ax, (0.08, 0.62), (0.19, 0.16), "status", "Where am I?\nWhat is allowed?", "blue")
    box(ax, (0.31, 0.62), (0.19, 0.16), "dispatch", "Route a user\nrequest through the\ndispatcher.", "green")
    box(ax, (0.54, 0.62), (0.19, 0.16), "advance", "Submit node output\nor gate decision.", "yellow")
    box(ax, (0.77, 0.62), (0.16, 0.16), "explain", "Recover context\nwhen unsure.", "purple")

    box(ax, (0.22, 0.28), (0.25, 0.16), "Node contract", "required output schema,\nexternal gate contract,\nallowed transitions.", "gray")
    box(ax, (0.55, 0.28), (0.25, 0.16), "State response", "orientation, recent context,\nneighborhood routes,\nnext command.", "red")

    arrow(ax, (0.27, 0.70), (0.31, 0.70))
    arrow(ax, (0.50, 0.70), (0.54, 0.70))
    arrow(ax, (0.73, 0.70), (0.77, 0.70))
    arrow(ax, (0.85, 0.62), (0.67, 0.44), "more detail", rad=0.15)
    arrow(ax, (0.64, 0.62), (0.39, 0.44), "validated output", rad=-0.08)
    arrow(ax, (0.47, 0.36), (0.55, 0.36), "runtime returns")
    arrow(ax, (0.55, 0.31), (0.17, 0.62), "re-anchor", rad=0.18)
    save(fig, "command_loop.png")


def workspace_layout():
    fig, ax = setup("Workspace as graph repository")

    lines = [
        ".ripplegraph/",
        "  registry.json",
        "  graphs/",
        "    dispatcher/",
        "      graph.json",
        "      AGENT.md",
        "    specdev-assignment/",
        "      graph.json",
        "      templates/",
        "    review-tool/",
        "      graph.json",
        "  current.json",
        "  runs/",
        "    specdev-2026-05-21-001/",
        "      checkpoint.json",
        "      transition-log.jsonl",
        "      artifacts/",
    ]

    box(ax, (0.06, 0.13), (0.42, 0.74), "Filesystem contract", "\n".join(lines), "gray", fontsize=9)
    box(ax, (0.57, 0.67), (0.33, 0.14), "Graph packages", "Self-contained, drag-and-drop units.\nDefinition, docs, templates, assets.", "purple")
    box(ax, (0.57, 0.47), (0.33, 0.14), "Registry", "Indexes package ids and metadata.\nDispatcher uses it to select actions.", "blue")
    box(ax, (0.57, 0.27), (0.33, 0.14), "Runs", "Durable execution evidence:\ncheckpoint, logs, artifacts.", "green")

    arrow(ax, (0.48, 0.64), (0.57, 0.74), "graphs/*")
    arrow(ax, (0.48, 0.50), (0.57, 0.54), "registry")
    arrow(ax, (0.48, 0.31), (0.57, 0.34), "runs/*")
    save(fig, "workspace_layout.png")


def run_lifecycle():
    fig, ax = setup("Workflow run lifecycle")

    box(ax, (0.08, 0.58), (0.18, 0.15), "created", "start_run creates\ncheckpoint and focus.", "blue")
    box(ax, (0.32, 0.58), (0.18, 0.15), "active", "Node output or gate\ndecision expected.", "green")
    box(ax, (0.56, 0.58), (0.18, 0.15), "suspended", "Saved run,\nnot focused.", "yellow")
    box(ax, (0.32, 0.28), (0.18, 0.15), "completed", "Terminal node.\nEvidence retained.", "purple")
    box(ax, (0.56, 0.28), (0.18, 0.15), "abandoned", "Explicit stop.\nHistory retained.", "red")

    arrow(ax, (0.26, 0.655), (0.32, 0.655), "focus")
    arrow(ax, (0.50, 0.655), (0.56, 0.655), "pause")
    arrow(ax, (0.56, 0.61), (0.50, 0.61), "resume")
    arrow(ax, (0.41, 0.58), (0.41, 0.43), "terminal")
    arrow(ax, (0.65, 0.58), (0.65, 0.43), "abandon")
    arrow(ax, (0.50, 0.34), (0.56, 0.34), "manual")
    save(fig, "run_lifecycle.png")


def main():
    architecture_layers()
    graph_kinds()
    command_loop()
    workspace_layout()
    run_lifecycle()


if __name__ == "__main__":
    main()
