import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Read token from Authorization header (frontend sends it from localStorage)
    const authHeader = request.headers.get("Authorization");
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const queryString = searchParams.toString();
    const backendUrl = `http://127.0.0.1:8000/api/departments${queryString ? `?${queryString}` : ""}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(backendUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { detail: "Failed to fetch departments" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { detail: "Server error", error: String(error) },
      { status: 500 }
    );
  }
}
