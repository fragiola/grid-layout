import { NOTE, ORDERS, type WidgetKind } from "../_kit/catalogue";
import { formatChange, sparkline, WIDGETS } from "../_kit/widgets";
import * as styles from "./styles";

const revenue = WIDGETS[0];

/** What a widget shows, by its kind: demo content, the app's. */
export function WidgetBody({ kind }: { kind: WidgetKind }) {
    if (kind === "kpi") {
        return (
            <span className={styles.kpi}>
                <span className={styles.value}>{revenue?.value}</span>
                <span className={styles.change}>
                    {formatChange(revenue?.change ?? 0)}
                </span>
            </span>
        );
    }
    if (kind === "chart") {
        return (
            <svg
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
                className={styles.chart}
            >
                <path d={sparkline(revenue?.points ?? [0, 1])} />
            </svg>
        );
    }
    if (kind === "table") {
        return (
            <table className={styles.table}>
                <tbody>
                    {ORDERS.map((order) => (
                        <tr key={order.id} className={styles.row}>
                            <td>{order.id}</td>
                            <td>{order.customer}</td>
                            <td className={styles.total}>{order.total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }
    return <p className={styles.note}>{NOTE}</p>;
}
