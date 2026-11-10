import type { ReactNode } from "react";

/**
 * WHO IT'S FOR — the comp's photography section, built without photography.
 *
 * The approved comp reserved two portrait photo slots ("tech on site", "van on
 * a job site"). There is no photography yet, and an empty dashed frame must
 * never go live, so this section ships as the two-column editorial version of
 * the same idea: the statement on the left, the supporting copy and a quiet
 * index of the trades on the right. Same copy, no placeholder boxes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PHOTO SLOT — where the real photographs drop in later.
 *
 * This component is the single slot. When the commissioned photography lands,
 * replace <TradeIndex /> below with a matched pair of <figure> elements and
 * keep the art direction that was written for the shoot:
 *
 *   PHOTO 01 — tech on site
 *     Subject: a service tech mid-job at a residential condenser, hands in
 *     frame, face not turned to camera.
 *     Crop: 3:4 vertical, waist up, subject right of centre with headroom for
 *     a caption.
 *     Grade: cool shadows, warm skin, desaturated greens, no HDR, no fisheye.
 *
 *   PHOTO 02 — van on a job site
 *     Subject: a wrapped service van on a suburban driveway at golden hour,
 *     rear doors open, ladder rack visible, no legible third-party branding.
 *     Crop: 3:4 vertical, rear three-quarter of the van, roofline and open sky
 *     above for a caption.
 *     Grade: warm highlights, deep blue shadows to match Midnight Abyss.
 *
 * Rules for the swap: both frames share one portrait ratio, the columns are
 * minmax(0,1fr) so one caption can never starve the other frame, and no stock
 * people or borrowed customer imagery — ever.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The trades named in the paragraph above, set as an editorial index. */
const TRADES: ReactNode[] = [
  <>HVAC</>,
  <>Roofing</>,
  <>Plumbing</>,
  <>Electrical</>,
];

function TradeIndex() {
  return (
    <ul className="trades">
      {TRADES.map((trade, i) => (
        <li key={i}>
          <b>{trade}</b>
        </li>
      ))}
    </ul>
  );
}

export default function PeopleSection() {
  return (
    <section className="section people" id="who">
      <div className="wrap people__grid">
        <div className="people__copy">
          <span className="overline">Who this is for</span>
          <h2 className="h2">Built for people whose office has a steering wheel.</h2>
          <p>
            Built for HVAC, roofing, plumbing and electrical businesses — the trades that
            lose a job every time nobody picks up. If you&apos;ve ever lost a
            nine-thousand-dollar install because you were elbow-deep in a condenser, this was
            built for you.
          </p>
          <TradeIndex />
        </div>
      </div>
    </section>
  );
}
