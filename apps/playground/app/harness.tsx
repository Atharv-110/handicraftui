"use client";

import { useState } from "react";
import {
  HandicraftProvider,
  type Fidelity,
  type FillLevel,
  type Hand,
  type InkStyle,
  SketchMark,
} from "@handicraft/core";
import { Badge } from "@/ui/badge/badge";
import { Button } from "@/ui/button/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/card/card";
import { Input } from "@/ui/input/input";
import { Checkbox } from "@/ui/checkbox/checkbox";
import { Label } from "@/ui/label/label";
import { Separator } from "@/ui/separator/separator";
import { PerfReadout } from "./perf-readout";

export interface HarnessProps {
  initialFidelity?: Fidelity;
  initialDark?: boolean;
  initialTexture?: boolean;
  initialStress?: boolean;
  initialHand?: Hand;
  initialInk?: InkStyle;
  initialFill?: FillLevel;
  initialDrawOn?: boolean;
  initialDrawMs?: number;
}

export function Harness({
  initialFidelity = "high",
  initialDark = false,
  initialTexture = true,
  initialStress = false,
  initialHand = "natural",
  initialInk = "layered",
  initialFill = "med",
  initialDrawOn = false,
  initialDrawMs = 1100,
}: HarnessProps) {
  const [fidelity, setFidelity] = useState<Fidelity>(initialFidelity);
  const [dark, setDark] = useState(initialDark);
  const [texture, setTexture] = useState(initialTexture);
  const [stress, setStress] = useState(initialStress);
  const [hand, setHand] = useState<Hand>(initialHand);
  const [ink, setInk] = useState<InkStyle>(initialInk);
  const [fill, setFill] = useState<FillLevel>(initialFill);
  const [drawOn, setDrawOn] = useState(initialDrawOn);
  const [drawMs, setDrawMs] = useState(initialDrawMs);

  return (
    <div className={dark ? "dark" : undefined}>
      <div className="bg-hc-paper text-hc-ink min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <PerfReadout />

          <Controls
            fidelity={fidelity}
            onFidelity={setFidelity}
            dark={dark}
            onDark={setDark}
            texture={texture}
            onTexture={setTexture}
            stress={stress}
            onStress={setStress}
            hand={hand}
            onHand={setHand}
            ink={ink}
            onInk={setInk}
            fill={fill}
            onFill={setFill}
            drawOn={drawOn}
            onDrawOn={setDrawOn}
            drawMs={drawMs}
            onDrawMs={setDrawMs}
          />

          <HandicraftProvider
            fidelity={fidelity}
            texture={texture}
            hand={hand}
            ink={ink}
            fill={fill}
            drawOn={drawOn}
            drawOnDuration={drawMs}
            chalk={dark}
          >
            <section className="mt-10 space-y-10" data-hc-texture={texture ? "on" : undefined}>
              <Group title="Buttons — variants">
                <Button>Save changes</Button>
                <Button variant="primary">Publish</Button>
                <Button variant="danger">Delete</Button>
                <Button variant="ghost">Cancel</Button>
                <Button disabled>Disabled</Button>
              </Group>

              <Group title="Buttons — sizes">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </Group>

              <Group title="Marks — drawn, not an icon font">
                <div className="flex flex-wrap items-center gap-5">
                  {(
                    [
                      "check",
                      "cross",
                      "chevron",
                      "arrow",
                      "dot",
                      "plus",
                      "minus",
                      "ellipsis",
                      "bracket",
                      "circle-around",
                    ] as const
                  ).map((n) => (
                    <span key={n} className="flex flex-col items-center gap-1">
                      <SketchMark name={n} size={22} seedKey={n} />
                      <span className="font-note text-hc-ink-soft text-[10px]">{n}</span>
                    </span>
                  ))}
                </div>
              </Group>

              <Group title="Checkbox — mark and frame share one hand">
                <div className="flex flex-col gap-3">
                  <Checkbox label="Remember me" defaultChecked />
                  <Checkbox label="Send me updates" />
                  <Checkbox label="Disabled, checked" defaultChecked disabled />
                  <Checkbox aria-label="No visible label" />
                </div>
              </Group>

              <Group title="Badge">
                <Badge>Draft</Badge>
                <Badge variant="marked">New</Badge>
                <Badge variant="danger">Overdue</Badge>
                <Badge variant="danger">3</Badge>
                <Badge variant="ghost">Archived</Badge>
                <Badge>9</Badge>
                <Badge>In review since Tuesday</Badge>
              </Group>

              <Group title="Label and Input">
                <div className="w-full max-w-sm space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="hc-email">Email</Label>
                    <Input id="hc-email" placeholder="you@example.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="hc-note">Disabled</Label>
                    <Input id="hc-note" placeholder="Disabled" disabled />
                  </div>
                </div>
              </Group>

              <Group title="Cards">
                <div className="grid w-full gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Plain card</CardTitle>
                      <CardDescription>No margin rule.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      Every frame picks one of eight hand-authored wobble variants from a hash of
                      its own id, so no two boxes on this page are identical.
                    </CardContent>
                    <CardFooter>
                      <Button size="sm">Open</Button>
                      <Badge variant="marked">New</Badge>
                    </CardFooter>
                  </Card>

                  <Card ruled>
                    <CardHeader>
                      <CardTitle>Ruled card</CardTitle>
                      <CardDescription>With the exercise-book margin rule.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      The rule marks where the content column begins — structural, not decorative.
                    </CardContent>
                  </Card>
                </div>
              </Group>

              <Group title="Surfaces">
                <div className="grid w-full gap-4 sm:grid-cols-2">
                  <Card className="hc-ruled">
                    <CardTitle>Ruled paper</CardTitle>
                  </Card>
                  <Card className="hc-grid">
                    <CardTitle>Graph paper</CardTitle>
                  </Card>
                </div>
                <p className="font-body mt-2 text-sm">
                  Highlighter is <span className="hc-marked">a background behind text</span>, never
                  a text colour — so it can never be the only thing carrying meaning.
                </p>
              </Group>

              <Group title="Separator">
                <div className="flex w-full max-w-md flex-col">
                  <p className="font-body text-sm leading-relaxed">
                    A rule between two sections, drawn like everything else in Handicraft rather
                    than styled as a plain border.
                  </p>
                  <Separator className="my-4" />
                  <p className="font-body text-sm leading-relaxed">
                    Orientation only changes which axis the rule runs along — the taper, roughness
                    and stroke weight stay identical either way.
                  </p>
                  <Separator className="my-4" />
                  <p className="font-body text-sm leading-relaxed">
                    This one is decorative and drops out of the accessibility tree, unlike the two
                    rules above it.
                  </p>
                  <Separator decorative className="my-4" />
                  <div className="flex items-stretch gap-3">
                    <span className="font-hand text-sm">Docs</span>
                    <Separator orientation="vertical" />
                    <span className="font-hand text-sm">API</span>
                    <Separator orientation="vertical" />
                    <span className="font-hand text-sm">Changelog</span>
                  </div>
                </div>
              </Group>

              {stress ? (
                <Group title="Stress — 500 frames">
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 500 }, (_, i) => (
                      <Button key={i} size="sm">
                        {i}
                      </Button>
                    ))}
                  </div>
                </Group>
              ) : null}
            </section>
          </HandicraftProvider>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-note text-hc-ink-soft mb-3 text-xs tracking-widest uppercase">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

interface ControlsProps {
  fidelity: Fidelity;
  onFidelity: (f: Fidelity) => void;
  dark: boolean;
  onDark: (v: boolean) => void;
  texture: boolean;
  onTexture: (v: boolean) => void;
  stress: boolean;
  onStress: (v: boolean) => void;
  hand: Hand;
  onHand: (h: Hand) => void;
  ink: InkStyle;
  onInk: (i: InkStyle) => void;
  fill: FillLevel;
  onFill: (f: FillLevel) => void;
  drawOn: boolean;
  onDrawOn: (v: boolean) => void;
  drawMs: number;
  onDrawMs: (v: number) => void;
}

/**
 * Deliberately plain HTML controls. If the harness used Handicraft components
 * to drive the harness, a rendering bug would take the controls down with it.
 */
function Controls(props: ControlsProps) {
  return (
    <div className="font-note border-hc-ink-faint/40 flex flex-wrap items-center gap-x-5 gap-y-3 border-b pb-4 text-sm">
      <Select
        label="fidelity"
        value={props.fidelity}
        onChange={props.onFidelity}
        options={[
          ["lite", "lite (CSS, 0 JS)"],
          ["high", "high (rough.js)"],
        ]}
      />
      <Select
        label="hand"
        value={props.hand}
        onChange={props.onHand}
        options={[
          ["steady", "steady"],
          ["natural", "natural"],
          ["loose", "loose"],
          ["hurried", "hurried"],
        ]}
      />
      <Select
        label="fill"
        value={props.fill}
        onChange={props.onFill}
        options={[
          ["no", "no"],
          ["low", "low"],
          ["med", "med"],
          ["high", "high"],
        ]}
      />
      <Select
        label="ink"
        value={props.ink}
        onChange={props.onInk}
        options={[
          ["layered", "layered"],
          ["plain", "plain"],
        ]}
      />

      <Toggle label="dark" checked={props.dark} onChange={props.onDark} />
      <Toggle label="texture" checked={props.texture} onChange={props.onTexture} />
      <Toggle label="draw-on" checked={props.drawOn} onChange={props.onDrawOn} />
      {props.drawOn ? (
        <label className="flex items-center gap-2">
          <span className="text-hc-ink-soft">speed</span>
          <input
            type="range"
            min={300}
            max={3000}
            step={100}
            value={props.drawMs}
            onChange={(e) => props.onDrawMs(Number(e.target.value))}
          />
          <span className="text-hc-ink-soft tabular-nums">{props.drawMs}ms</span>
        </label>
      ) : null}
      <Toggle label="stress ×500" checked={props.stress} onChange={props.onStress} />
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<[T, string]>;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-hc-ink-soft">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="border-hc-ink rounded border px-2 py-1"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-hc-ink-soft">{label}</span>
    </label>
  );
}
