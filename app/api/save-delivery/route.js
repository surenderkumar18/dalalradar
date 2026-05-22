// app/api/save-delivery/route.js

import fs from "fs";
import path from "path";

export async function POST(req) {
  try {

    const { label, data, overwrite } = await req.json();

    if (!label || !data) {
      return Response.json({ error: "Missing data" }, { status: 400 });
    }

    const deliveryPath = path.join(process.cwd(), "data", "delivery.json");

    let delivery = {};

    if (fs.existsSync(deliveryPath)) {
      delivery = JSON.parse(fs.readFileSync(deliveryPath, "utf-8"));
    }

    if (delivery[label] && !overwrite) {
      return Response.json(
        { error: "Label already exists" },
        { status: 400 }
      );
    }

    /* ---------------------------
       MINIFY DATASET
    --------------------------- */

    const minifiedString = JSON.stringify(data);

    delivery[label] = minifiedString;

    /* ---------------------------
       SORT KEYS BY DATE LABEL
    --------------------------- */

    const monthIndex = {
      jan:0,feb:1,mar:2,apr:3,may:4,jun:5,
      jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
    };

    const keys = Object.keys(delivery).sort((a,b)=>{

      const [ma,da] = a.split("_");
      const [mb,db] = b.split("_");

      const dateA = new Date(2026, monthIndex[ma], Number(da));
      const dateB = new Date(2026, monthIndex[mb], Number(db));

      return dateA - dateB;

    });

    /* ---------------------------
       WRITE FILE MANUALLY
    --------------------------- */

    const lines = ["{"];

    keys.forEach((key, i) => {

      const value = delivery[key];

      const val =
        typeof value === "string"
          ? value
          : JSON.stringify(value);

      lines.push(`  "${key}": ${val}${i < keys.length - 1 ? "," : ""}`);

    });

    lines.push("}");

    fs.writeFileSync(deliveryPath, lines.join("\n"));

    return Response.json({ success: true });

  } catch (err) {

    return Response.json({ error: "Save failed" }, { status: 500 });

  }
}