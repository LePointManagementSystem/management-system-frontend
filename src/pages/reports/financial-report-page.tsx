import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const FinancialReportPage: React.FC = () => {
    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold mb-6">Financial Report</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Financial Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Financial report content will be added here.</p>
                </CardContent>
            </Card>
        </div>
    )
}

export default FinancialReportPage

