import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("access_token")?.value;
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Build query string
    const queryString = searchParams.toString();
    const backendUrl = `http://localhost:8000/api/departments${queryString ? `?${queryString}` : ""}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
