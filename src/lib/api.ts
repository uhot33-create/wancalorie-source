import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getDb } from "@/lib/db";
import { dailyTargetKcal } from "@/lib/calories";
import type {
  Activity,
  DaySummary,
  Dog,
  DogInput,
  Food,
  FoodInput,
  FoodKind,
  FoodUnit,
  Goal,
  LifeStage,
  LogEntry,
} from "@/lib/types";
import { parseNum, shiftDate } from "@/lib/utils";

function sanitizeDog(input: DogInput): DogInput {
  const name = input.name.trim();
  if (!name) throw new Error("名前を入力してください");
  if (!(input.currentWeightKg > 0) || input.currentWeightKg > 120) {
    throw new Error("現在の体重を正しく入力してください");
  }
  if (!(input.idealWeightKg > 0) || input.idealWeightKg > 120) {
    throw new Error("理想体重を正しく入力してください");
  }
  const meals = Math.round(input.mealsPerDay);
  if (meals < 1 || meals > 4) throw new Error("食事回数は1〜4回です");
  const treatPct = Math.min(Math.max(input.treatPct, 0), 20);
  return {
    ...input,
    name,
    currentWeightKg: Math.round(input.currentWeightKg * 100) / 100,
    idealWeightKg: Math.round(input.idealWeightKg * 100) / 100,
    mealsPerDay: meals,
    treatPct,
  };
}

export const getDog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const snapshot = await db
      .collection(`users/${context.userId}/dogs`)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0]!;
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name ?? "",
      currentWeightKg: parseNum(data.currentWeightKg),
      idealWeightKg: parseNum(data.idealWeightKg),
      lifeStage: (data.lifeStage ?? "adult") as LifeStage,
      activity: (data.activity ?? "moderate") as Activity,
      neutered: Boolean(data.neutered),
      goal: (data.goal ?? "maintain") as Goal,
      mealsPerDay: Number(data.mealsPerDay) || 2,
      treatPct: parseNum(data.treatPct ?? 10),
      targetKcal: Number(data.targetKcal) || 0,
    } as Dog;
  });

export const saveDog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: DogInput) => sanitizeDog(input))
  .handler(async ({ context, data }) => {
    const target = dailyTargetKcal(data);
    const db = getDb();
    const dogsCol = db.collection(`users/${context.userId}/dogs`);
    const snapshot = await dogsCol.limit(1).get();

    const dogData = {
      name: data.name,
      currentWeightKg: data.currentWeightKg,
      idealWeightKg: data.idealWeightKg,
      lifeStage: data.lifeStage,
      activity: data.activity,
      neutered: data.neutered,
      goal: data.goal,
      mealsPerDay: data.mealsPerDay,
      treatPct: data.treatPct,
      targetKcal: target,
      updatedAt: new Date().toISOString(),
    };

    if (!snapshot.empty) {
      const doc = snapshot.docs[0]!;
      await doc.ref.update(dogData);
      return {
        id: doc.id,
        ...data,
        targetKcal: target,
      } as Dog;
    }

    const newDoc = await dogsCol.add({
      ...dogData,
      createdAt: new Date().toISOString(),
    });

    return {
      id: newDoc.id,
      ...data,
      targetKcal: target,
    } as Dog;
  });

export const listFoods = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const snapshot = await db
      .collection(`users/${context.userId}/foods`)
      .get();

    const foods: Food[] = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name ?? "",
        kind: (d.kind ?? "meal") as FoodKind,
        kcal: parseNum(d.kcal),
        unit: (d.unit ?? "100g") as FoodUnit,
      };
    });

    return foods.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      return a.name.localeCompare(b.name, "ja");
    });
  });

export const addFood = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: FoodInput) => {
    const name = input.name.trim();
    if (!name) throw new Error("フード名を入力してください");
    if (!(input.kcal > 0) || input.kcal > 20000) {
      throw new Error("カロリーを正しく入力してください");
    }
    if (input.kind !== "meal" && input.kind !== "treat") {
      throw new Error("種類が不正です");
    }
    if (!["100g", "serving", "piece"].includes(input.unit)) {
      throw new Error("単位が不正です");
    }
    return { ...input, name, kcal: Math.round(input.kcal * 10) / 10 };
  })
  .handler(async ({ context, data }) => {
    const db = getDb();
    const docRef = await db.collection(`users/${context.userId}/foods`).add({
      name: data.name,
      kind: data.kind,
      kcal: data.kcal,
      unit: data.unit,
      createdAt: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      name: data.name,
      kind: data.kind,
      kcal: data.kcal,
      unit: data.unit,
    } as Food;
  });

export const deleteFood = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const db = getDb();
    await db.doc(`users/${context.userId}/foods/${id}`).delete();
    return { ok: true };
  });

type AddEntryInput = {
  dogId: string;
  logDate: string;
  name: string;
  kind: FoodKind;
  kcal: number;
  amount?: number | null;
  unit?: string | null;
  foodId?: string | null;
};

export const listEntries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { dogId: string; logDate: string }) => input)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const snapshot = await db
      .collection(`users/${context.userId}/log_entries`)
      .where("dogId", "==", data.dogId)
      .where("logDate", "==", data.logDate)
      .get();

    const entries: LogEntry[] = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        dogId: d.dogId,
        logDate: d.logDate,
        name: d.name ?? "",
        kind: (d.kind ?? "meal") as FoodKind,
        kcal: parseNum(d.kcal),
        amount: d.amount == null ? null : parseNum(d.amount),
        unit: d.unit ?? null,
        foodId: d.foodId ?? null,
        createdAt: typeof d.createdAt === "string" ? d.createdAt : new Date().toISOString(),
      };
    });

    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

export const addEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AddEntryInput) => {
    const name = input.name.trim() || (input.kind === "treat" ? "おやつ" : "ごはん");
    if (!(input.kcal > 0) || input.kcal > 20000) {
      throw new Error("カロリーを正しく入力してください");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.logDate)) {
      throw new Error("日付が不正です");
    }
    return {
      ...input,
      name,
      kcal: Math.round(input.kcal * 10) / 10,
      amount: input.amount ?? null,
      unit: input.unit ?? null,
      foodId: input.foodId ?? null,
    };
  })
  .handler(async ({ context, data }) => {
    const db = getDb();
    const dogDoc = await db.doc(`users/${context.userId}/dogs/${data.dogId}`).get();
    if (!dogDoc.exists) throw new Error("愛犬が見つかりません");

    const createdAt = new Date().toISOString();
    const docRef = await db.collection(`users/${context.userId}/log_entries`).add({
      dogId: data.dogId,
      logDate: data.logDate,
      name: data.name,
      kind: data.kind,
      kcal: data.kcal,
      amount: data.amount,
      unit: data.unit,
      foodId: data.foodId,
      createdAt,
    });

    return {
      id: docRef.id,
      dogId: data.dogId,
      logDate: data.logDate,
      name: data.name,
      kind: data.kind,
      kcal: data.kcal,
      amount: data.amount,
      unit: data.unit,
      foodId: data.foodId,
      createdAt,
    } as LogEntry;
  });

export const deleteEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const db = getDb();
    await db.doc(`users/${context.userId}/log_entries/${id}`).delete();
    return { ok: true };
  });

export const weekSummary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { dogId: string; endDate: string }) => input)
  .handler(async ({ context, data }) => {
    const db = getDb();
    const startDate = shiftDate(data.endDate, -6);

    const snapshot = await db
      .collection(`users/${context.userId}/log_entries`)
      .where("dogId", "==", data.dogId)
      .where("logDate", ">=", startDate)
      .where("logDate", "<=", data.endDate)
      .get();

    // 日付ごとに初期マップを作成
    const summaryMap = new Map<string, { totalKcal: number; mealKcal: number; treatKcal: number; count: number }>();
    for (let i = 0; i < 7; i++) {
      const d = shiftDate(startDate, i);
      summaryMap.set(d, { totalKcal: 0, mealKcal: 0, treatKcal: 0, count: 0 });
    }

    snapshot.docs.forEach((doc) => {
      const d = doc.data();
      const date = String(d.logDate);
      const kcal = parseNum(d.kcal);
      const kind = d.kind;

      const current = summaryMap.get(date);
      if (current) {
        current.totalKcal += kcal;
        if (kind === "meal") current.mealKcal += kcal;
        if (kind === "treat") current.treatKcal += kcal;
        current.count += 1;
      }
    });

    const result: DaySummary[] = [];
    summaryMap.forEach((val, date) => {
      result.push({
        date,
        totalKcal: Math.round(val.totalKcal * 10) / 10,
        mealKcal: Math.round(val.mealKcal * 10) / 10,
        treatKcal: Math.round(val.treatKcal * 10) / 10,
        count: val.count,
      });
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  });
