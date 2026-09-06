import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { PageContainer } from '@/components/shell/page-container';
import { Breadcrumbs } from '@/components/shell/breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { requireInspector } from '@/lib/auth/helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSignedInspectionImageUrl } from '@/lib/storage/inspection-storage';
import { DeclarationList } from '@/components/declarations/declaration-list';
import type { Inspection, PackagingImage, Declaration } from '@/types/database.types';

export default async function ExtractReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireInspector({ redirectTo: '/login' });
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  // Attempt to fetch real inspection, packaging images, and declarations from database
  let inspectionNumber = id;
  let imageUrl: string | null = null;
  let imageMeta: { width: number; height: number; panelType: string } | null = null;
  let declarations: Declaration[] = [];

  if (id && id !== 'demo-insp-001') {
    const { data: inspection } = (await (supabase.from('inspections') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{
            data: (Inspection & { packaging_images?: PackagingImage[] }) | null;
          }>;
        };
      };
    })
      .select('*, packaging_images(*)')
      .eq('id', id)
      .single());

    if (inspection) {
      inspectionNumber = inspection.inspection_number;
      const primaryImage = inspection.packaging_images?.[0];
      if (primaryImage) {
        imageMeta = {
          width: primaryImage.width_px,
          height: primaryImage.height_px,
          panelType: primaryImage.panel_type,
        };
        const { signedUrl } = await getSignedInspectionImageUrl(
          supabase,
          primaryImage.storage_path,
          3600
        );
        imageUrl = signedUrl;
      }
    }

    // Fetch existing declarations
    const { data: dbDeclarations } = await (
      supabase.from('declarations') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: Declaration[] | null;
            }>;
          };
        };
      }
    )
      .select('*')
      .eq('inspection_id', id)
      .order('created_at', { ascending: true });

    if (dbDeclarations && dbDeclarations.length > 0) {
      declarations = dbDeclarations;
    }
  }

  // Fallback demo declarations for mock demo inspection
  if (declarations.length === 0 && id === 'demo-insp-001') {
    declarations = [
      {
        id: 'dec-demo-1',
        inspection_id: id,
        image_id: null,
        field_name: 'mrp',
        raw_ocr_text: 'MRP Rs. 50.00 (inclusive of all taxes)',
        observed_value: 'Rs. 50.00 (incl. of all taxes)',
        normalized_value: { amount: 50.0, currency: 'INR', taxes_included: true },
        confidence: 0.98,
        bbox: { x: 80, y: 200, width: 320, height: 32 },
        is_manually_edited: false,
        edited_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-demo-2',
        inspection_id: id,
        image_id: null,
        field_name: 'net_quantity',
        raw_ocr_text: 'Net Qty: 200 g',
        observed_value: '200 g',
        normalized_value: { quantity: 200, unit: 'g' },
        confidence: 0.96,
        bbox: { x: 80, y: 260, width: 140, height: 32 },
        is_manually_edited: false,
        edited_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-demo-3',
        inspection_id: id,
        image_id: null,
        field_name: 'manufacturing_date',
        raw_ocr_text: 'Mfg Date: 08/2026',
        observed_value: '08/2026',
        normalized_value: { month: 8, year: 2026 },
        confidence: 0.94,
        bbox: { x: 80, y: 320, width: 160, height: 28 },
        is_manually_edited: false,
        edited_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-demo-4',
        inspection_id: id,
        image_id: null,
        field_name: 'name_address_manufacturer',
        raw_ocr_text: 'Manufactured by: Sunrise Foods Pvt. Ltd., Pune',
        observed_value: 'Sunrise Foods Pvt. Ltd., Pune',
        normalized_value: { name_and_address: 'Sunrise Foods Pvt. Ltd., Pune' },
        confidence: 0.91,
        bbox: { x: 80, y: 430, width: 420, height: 30 },
        is_manually_edited: false,
        edited_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'dec-demo-5',
        inspection_id: id,
        image_id: null,
        field_name: 'consumer_care',
        raw_ocr_text: 'Consumer Care: customercare@sunrisefoods.in',
        observed_value: 'customercare@sunrisefoods.in',
        normalized_value: { email: 'customercare@sunrisefoods.in' },
        confidence: 0.92,
        bbox: { x: 80, y: 490, width: 380, height: 28 },
        is_manually_edited: false,
        edited_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  return (
    <AppShell
      userRole={profile.role}
      userName={profile.full_name}
      stationName={profile.jurisdiction}
    >
      <PageContainer
        title={`Declaration Extraction Review — ${inspectionNumber}`}
        description="Verify and correct candidate Legal Metrology declarations extracted from packaging evidence."
        actions={
          <Link href={`/scan/${id}/result`}>
            <Button className="gap-2 font-bold shadow-sm">
              <span>Run Compliance Check</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        }
      >
        <Breadcrumbs
          items={[
            { label: 'Field Inspections', href: '/scan' },
            { label: 'Inspection', href: `/scan/${id}/extract` },
            { label: 'Declaration Extraction' },
          ]}
        />

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          {/* Label Evidence Preview Panel */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="border sticky top-20">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span>Packaging Label Evidence</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {imageMeta?.panelType.replace('_', ' ') || 'Primary Display'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {imageUrl ? (
                  <div className="aspect-[4/3] rounded-lg bg-black overflow-hidden flex items-center justify-center border shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Captured label evidence"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] rounded-lg bg-muted/40 border border-dashed flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs font-semibold">Captured Packaging Image</span>
                    <span className="text-[11px] text-muted-foreground mt-1">
                      1920 × 1080 px • Quality: Acceptable
                    </span>
                  </div>
                )}

                {imageMeta && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>
                      Resolution: {imageMeta.width} × {imageMeta.height} px
                    </span>
                    <span className="text-compliance-pass-text font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Storage Verified
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Extracted Declarations Interactive Management */}
          <div className="lg:col-span-7 space-y-3">
            <DeclarationList
              inspectionId={id}
              initialDeclarations={declarations}
            />
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
