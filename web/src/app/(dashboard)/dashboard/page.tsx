import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="BRICS ERP — CP1 build in progress"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Production', 'Labour', 'Sales', 'Accounts'].map((module) => (
          <Card key={module}>
            <CardHeader>
              <CardTitle>{module}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="muted">Coming in P1–P10</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
