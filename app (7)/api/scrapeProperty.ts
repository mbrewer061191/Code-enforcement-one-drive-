import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Helper to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Allow simple CORS for now
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Missing address parameter' });
    }

    try {
        const searchAddress = address.toUpperCase().trim();

        // 1. Search for the property in Commerce district
        // We use the "school_distname" search type as found in our investigation
        // but filtered by the address manually after fetching, OR we could try the "street_address" search.
        // Based on investigation, "street_address" search worked too. Let's try that first as it returns fewer records.

        // Actually, the "street_address" search url found in step 52 was:
        // https://oktaxrolls.com/searchTaxRoll/ottawa?tax_info_sel=street_address&from_year=2025&to_year=2025&show_records=1000
        // But the API endpoint is /searchResult/ottawa/street_address

        // Let's use the API directly.
        const searchUrl = `https://oktaxrolls.com/searchResult/ottawa/street_address?from_year=2025&to_year=2025&street_name=${encodeURIComponent(searchAddress)}&show_records=100`;

        const searchResponse = await axios.get(searchUrl);
        const records = searchResponse.data?.data || [];

        if (records.length === 0) {
            return res.status(404).json({ error: 'No records found for this address' });
        }

        // 2. Find the best match (simple fuzzy match or just take the first one)
        // The API might return partial matches. Let's look for exact match on street name if possible,
        // but for now, we'll take the first record to be safe, or return a list if ambiguous.
        // For this MVP, let's take the first one.

        const record = records[0];
        // record structure based on investigation:
        // [year, taxId, schDistCode, schDistDesc, ownerLinkHtml, propertyType, baseTax, totalDue, ...]

        // We need to parse the ownerLinkHtml (index 4) to get the Tax Data ID
        const ownerLinkHtml = record[4];
        const $link = cheerio.load(ownerLinkHtml);
        const paramStr = $link('a').attr('href')?.split('?')[1];
        const urlParams = new URLSearchParams(paramStr);
        const taxDataId = urlParams.get('taxDataId');

        if (!taxDataId) {
            return res.status(500).json({ error: 'Could not extract Tax Data ID from record' });
        }

        // 3. Fetch Detail Page
        const detailUrl = `https://oktaxrolls.com/taxpayer/ottawa?taxDataId=${taxDataId}`;
        const detailResponse = await axios.get(detailUrl);
        const html = detailResponse.data;
        const $ = cheerio.load(html);

        // 4. Extract Data using Selectors found in investigation
        // Mailing Address: .col-lg-6 .detail-cont p
        const fullOwnerText = $('.col-lg-6 .detail-cont p').first().html() || '';
        // Format is Name <br> Address <br> City State Zip
        // We want to replace <br> with newlines to parse it cleaner
        const cleanOwnerText = fullOwnerText.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, "").trim();

        const lines = cleanOwnerText.split('\n').map(l => l.trim()).filter(l => l);
        const ownerName = lines[0] || '';
        const mailingAddress = lines.slice(1).join(', ');

        // Legal Description: .col-lg-12 .detail-cont p
        const legalDesc = $('.col-lg-12 .detail-cont p').first().text().trim();

        // Situs (Property Address) - usually on the page too, but we searched by it.
        // Selector: The investigation didn't explicitly note Situs selector on detail page, 
        // but it's likely in the "Property Information" section.
        // For now we'll return what we found.

        return res.status(200).json({
            success: true,
            data: {
                taxDataId,
                ownerName,
                mailingAddress,
                legalDescription: legalDesc,
                recordsFound: records.length
            }
        });

    } catch (error) {
        console.error('Scraping error:', error);
        return res.status(500).json({ error: 'Failed to scrape data', details: error.message });
    }
}
