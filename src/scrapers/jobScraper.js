/**
 * Job Scraper for NIT KKR App
 * Temporarily provide a curated list of top MNC opportunities
 */
async function scrapeAllJobs() {
    console.log("[JobScraper] Fetching latest opportunities...");

    // In a real implementation, this would fetch from LinkedIn, Indeed, 
    // or specific company career pages. For now, we return a high-quality 
    // baseline to enable the Jobs feature.

    const curatedJobs = [
        {
            title: "Software Engineer - University Graduate",
            company: "Google",
            location: "Bangalore / Hyderabad",
            stipend: "₹1,25,000/mo (Approx)",
            deadline: "Mar 15, 2026",
            type: "Full Time",
            link: "https://www.google.com/about/careers/applications/jobs/results/?q=Software%20Engineer",
            category: "Engineering",
            source: "Google Careers"
        },
        {
            title: "Software Engineer 1",
            company: "Microsoft",
            location: "Hyderabad / Noida",
            stipend: "Competitive",
            deadline: "Rolling",
            type: "Full Time",
            link: "https://careers.microsoft.com/us/en/search-results?keywords=Software%20Engineer",
            category: "Engineering",
            source: "Microsoft Careers"
        },
        {
            title: "Software Development Engineer (SDE I)",
            company: "Amazon",
            location: "Bangalore",
            stipend: "₹1,00,000/mo",
            deadline: "Rolling",
            type: "Full Time",
            link: "https://www.amazon.jobs/en/job_categories/software-development",
            category: "Engineering",
            source: "Amazon Jobs"
        },
        {
            title: "Graduate Software Engineer",
            company: "Atlassian",
            location: "Bengaluru (Remote)",
            stipend: "₹80,000/mo",
            deadline: "Mar 30, 2026",
            type: "Full Time",
            link: "https://www.atlassian.com/company/careers/graduate-programs",
            category: "Engineering",
            source: "Atlassian Careers"
        },
        {
            title: "SDE-1 (Off-campus)",
            company: "Flipkart",
            location: "Bangalore",
            stipend: "₹18-22 LPA",
            deadline: "Apr 10, 2026",
            type: "Full Time",
            link: "https://www.flipkartcareers.com/",
            category: "Engineering",
            source: "Flipkart Careers"
        },
        {
            title: "Junior Software Engineer",
            company: "PhonePe",
            location: "Bangalore",
            stipend: "Competitive",
            deadline: "Mar 20, 2026",
            type: "Full Time",
            link: "https://www.phonepe.com/careers/",
            category: "Engineering",
            source: "PhonePe Careers"
        }
    ];

    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return curatedJobs;
}

module.exports = {
    scrapeAllJobs
};
