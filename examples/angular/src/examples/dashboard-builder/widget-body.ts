import { Component, input } from "@angular/core";
import { NOTE, ORDERS, type WidgetKind } from "../_kit/catalogue";
import { formatChange, sparkline, WIDGETS } from "../_kit/widgets";
import * as styles from "./styles";

const revenue = WIDGETS[0];

/** What a widget shows, by its kind: demo content, the app's. */
@Component({
    selector: "builder-widget-body",
    host: { class: "contents" },
    template: `
        @switch (kind()) {
            @case ("kpi") {
                <span [class]="styles.kpi">
                    <span [class]="styles.value">{{ revenue?.value }}</span>
                    <span [class]="styles.change">
                        {{ formatChange(revenue?.change ?? 0) }}
                    </span>
                </span>
            }
            @case ("chart") {
                <svg
                    viewBox="0 0 100 32"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    [class]="styles.chart"
                >
                    <path [attr.d]="sparkline(revenue?.points ?? [0, 1])" />
                </svg>
            }
            @case ("table") {
                <table [class]="styles.table">
                    <tbody>
                        @for (order of orders; track order.id) {
                            <tr [class]="styles.row">
                                <td>{{ order.id }}</td>
                                <td>{{ order.customer }}</td>
                                <td [class]="styles.total">{{ order.total }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            }
            @default {
                <p [class]="styles.note">{{ note }}</p>
            }
        }
    `,
})
export class WidgetBody {
    readonly kind = input.required<WidgetKind>();
    protected readonly styles = styles;
    protected readonly revenue = revenue;
    protected readonly orders = ORDERS;
    protected readonly note = NOTE;
    protected readonly formatChange = formatChange;
    protected readonly sparkline = sparkline;
}
