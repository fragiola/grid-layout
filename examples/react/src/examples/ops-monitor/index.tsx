"use client";

import { GridLayout, type Layout } from "@fragiola/grid-layout-react";
import { CircleAlert, CircleCheck, CircleX, Radio } from "lucide-react";
import {
    countByStatus,
    SERVICES,
    type Service,
    type ServiceStatus,
    STATUS_LABELS,
} from "../_kit/datasets";
import * as styles from "./styles";

const COLS = 12;

// The title bar and the summary are statics: pinned at the top, never dragged and never pushed.
// Under them, one small tile per service, six to a row.
const layout: Layout = [
    { id: "title", x: 0, y: 0, w: COLS, h: 2, static: true },
    { id: "summary", x: 0, y: 2, w: COLS, h: 3, static: true },
    ...SERVICES.map((service, index) => ({
        id: service.id,
        x: (index % 6) * 2,
        y: 5 + Math.floor(index / 6) * 3,
        w: 2,
        h: 3,
    })),
];

const byId = new Map(SERVICES.map((service) => [service.id, service]));
const counts = countByStatus(SERVICES);

/** Each status's icon: with its word, a status never relies on colour alone. */
const ICONS = {
    ok: CircleCheck,
    warn: CircleAlert,
    down: CircleX,
} as const;

// An operations console: dense tiles on small rows (24 px), each saying its service's status in
// a word and an icon as well as a colour. People arrange the tiles as they like; the header tiles
// are `static: true`, so a tile dropped on them settles below instead. Tiles only move here
// (`resizable={false}`): their size is the monitor's.
export default function OpsMonitor() {
    return (
        <div className={styles.frame}>
            <GridLayout.Root
                defaultLayout={layout}
                cols={COLS}
                rowHeight={24}
                gap={[6, 6]}
                resizable={false}
                aria-label="Services"
                className={styles.root}
            >
                <GridLayout.Items>
                    {(item) => {
                        if (item.id === "title")
                            return <TitleBar key="title" />;
                        if (item.id === "summary")
                            return <Summary key="summary" />;
                        const service = byId.get(item.id);
                        return service ? (
                            <Tile key={item.id} service={service} />
                        ) : null;
                    }}
                </GridLayout.Items>
                <GridLayout.Placeholder className={styles.placeholder} />
            </GridLayout.Root>
        </div>
    );
}

function TitleBar() {
    return (
        <GridLayout.Item
            itemId="title"
            aria-label="Ops monitor"
            className={styles.titleBar}
        >
            <Radio aria-hidden="true" className={styles.icon} />
            <span className={styles.heading}>Ops monitor</span>
            <span className={styles.meta}>production · eu-west-1</span>
            <span className={styles.updated}>Updated 12:04 UTC</span>
        </GridLayout.Item>
    );
}

function Summary() {
    return (
        <GridLayout.Item
            itemId="summary"
            aria-label="Service summary"
            className={styles.summary}
        >
            {(Object.keys(STATUS_LABELS) as ServiceStatus[]).map((status) => {
                const Icon = ICONS[status];
                return (
                    <span key={status} className={styles.count(status)}>
                        <Icon aria-hidden="true" className={styles.countIcon} />
                        <span className={styles.countValue}>
                            {counts[status]}
                        </span>
                        <span className={styles.countLabel}>
                            {STATUS_LABELS[status]}
                        </span>
                    </span>
                );
            })}
        </GridLayout.Item>
    );
}

function Tile({ service }: { service: Service }) {
    const Icon = ICONS[service.status];
    return (
        <GridLayout.Item
            itemId={service.id}
            aria-label={service.name}
            data-status={service.status}
            className={styles.tile}
        >
            <span className={styles.stripe(service.status)} />
            <span className={styles.name}>{service.name}</span>
            <span className={styles.badge(service.status)}>
                <Icon aria-hidden="true" className={styles.badgeIcon} />
                {STATUS_LABELS[service.status]}
            </span>
            <span className={styles.metrics}>
                {service.p95} ms · {service.errors}% err
            </span>
        </GridLayout.Item>
    );
}
