import { NextRequest, NextResponse } from "next/server";
import { fetchLeetCodeDaily, fetchProblemDetails, parseProblemContent } from "@/lib/leetcode";

/**
 * GET /api/leetcode-daily?date=YYYY-MM-DD
 * Fetches LeetCode Daily Challenge for a specific date (or today if not specified)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // Optional: YYYY-MM-DD format
    
    // Step 1: Fetch the daily challenge metadata for the specified date
    const dailyChallenge = await fetchLeetCodeDaily(date || undefined);

    if (!dailyChallenge) {
      return NextResponse.json(
        {
          success: false,
          error: date 
            ? `Could not fetch the daily challenge for ${date}. It may not be available yet.`
            : "Could not fetch today's daily challenge. LeetCode may be unavailable."
        },
        { status: 503 }
      );
    }

    // Step 2: Fetch the full problem details using the slug
    const problemDetails = await fetchProblemDetails(dailyChallenge.slug);

    if (!problemDetails) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not fetch problem details for "${dailyChallenge.title}".`
        },
        { status: 404 }
      );
    }

    // Step 3: Parse the HTML content into structured format
    const parsedContent = parseProblemContent(problemDetails.content);

    return NextResponse.json({
      success: true,
      daily: {
        date: dailyChallenge.date,
        link: dailyChallenge.link,
      },
      problem: {
        ...problemDetails,
        parsedContent,
      },
    });
  } catch (error) {
    console.error("Error fetching LeetCode daily:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching the daily challenge."
      },
      { status: 500 }
    );
  }
}
