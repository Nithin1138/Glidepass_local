import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const getFilePath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "vitcodes.json");
};

const readCodes = () => {
  const filePath = getFilePath();
  if (!fs.existsSync(filePath)) {
    // Check if the default file exists in the parent templates/dev folder or fallback
    const defaultFilePath = path.join(process.cwd(), "..", "templates", "vitcodes.json");
    if (fs.existsSync(defaultFilePath)) {
      try {
        return JSON.parse(fs.readFileSync(defaultFilePath, "utf8"));
      } catch (e) {}
    }
    // Return sample/initial data if empty
    return [
      {
        id: "1",
        date: "2026-06-08",
        examType: "NERD",
        questions: [
          {
            id: "q1",
            title: "Two Sum",
            code: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> m;\n        for (int i = 0; i < nums.size(); i++) {\n            if (m.count(target - nums[i])) return {m[target - nums[i]], i};\n            m[nums[i]] = i;\n        }\n        return {};\n    }\n};",
            language: "cpp"
          }
        ]
      },
      {
        id: "2",
        date: "2026-06-08",
        examType: "Daily Assessment",
        questions: [
          {
            id: "q2",
            title: "Bubble Sort",
            code: "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]",
            language: "python"
          }
        ]
      }
    ];
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
};

const writeCodes = (data: any) => {
  const filePath = getFilePath();
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
};

export async function GET() {
  try {
    const data = readCodes();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Data must be an array of VIT codes" }, { status: 400 });
    }

    writeCodes(body);
    return NextResponse.json({ success: true, message: "Successfully updated VIT codes database" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
