// src/app/verify/certificate/[certId]/page.tsx
import { createClient } from '@supabase/supabase-js'; // **IMPORT the generic client**
import { CheckCircle, Bot, Award, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Import for the button

export default async function CertificateVerificationPage({ params }: { params: Promise<{ certId: string }> }) {
    // **THE DEFINITIVE FIX IS HERE**
    // We create a direct, public client using the environment variables.
    // This client is GUARANTEED to have the 'anon' role.
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Await params before using its properties
    const { certId } = await params;

    const { data: certificate } = await supabase
        .from('pd_certificates')
        .select('user_name, module_title, issued_at') // Select only the needed public data
        .eq('id', certId)
        .single();
    
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <main className="w-full max-w-4xl">
                {certificate ? (
                    <div className="relative bg-white shadow-2xl border-4 border-brand-secondary rounded-3xl overflow-hidden animate-fade-in">
                        {/* Decorative Border Pattern */}
                        <div className="absolute inset-0 bg-brand-secondary opacity-5"></div>
                        <div className="absolute top-0 left-0 w-full h-2 bg-brand-secondary"></div>
                        <div className="absolute bottom-0 left-0 w-full h-2 bg-brand-secondary"></div>
                        
                        {/* Corner Decorations */}
                        <div className="absolute top-6 left-6 w-16 h-16 border-4 border-brand-secondary rounded-full opacity-20"></div>
                        <div className="absolute top-6 right-6 w-16 h-16 border-4 border-brand-primary rounded-full opacity-20"></div>
                        <div className="absolute bottom-6 left-6 w-16 h-16 border-4 border-brand-primary rounded-full opacity-20"></div>
                        <div className="absolute bottom-6 right-6 w-16 h-16 border-4 border-brand-secondary rounded-full opacity-20"></div>
                        
                        <div className="relative z-10 p-12">
                            {/* Header Section */}
                            <div className="text-center mb-12">
                                <div className="inline-flex items-center justify-center w-24 h-24 bg-brand-primary rounded-full mb-6 shadow-lg">
                                    <Award className="h-12 w-12 text-white" />
                                </div>
                                <h1 className="text-4xl font-bold text-brand-secondary mb-2">
                                    Certificate of Completion
                                </h1>
                                <div className="w-32 h-1 bg-brand-secondary mx-auto rounded-full"></div>
                            </div>

                            {/* Main Content */}
                            <div className="text-center mb-12">
                                <p className="text-lg text-gray-600 mb-6 font-medium">This is to certify that</p>
                                <h2 className="text-5xl font-bold text-gray-900 mb-8 tracking-wide">
                                    {certificate.user_name}
                                </h2>
                                <p className="text-xl text-gray-600 mb-4">has successfully completed the</p>
                                <h3 className="text-3xl font-bold text-brand-primary mb-6">
                                    {certificate.module_title}
                                </h3>
                                <p className="text-lg text-gray-600 font-medium">Professional Development Module</p>
                            </div>

                            {/* Details Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                <div className="text-center p-6 bg-blue-50 rounded-2xl border border-blue-200">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-secondary rounded-full mb-4">
                                        <Calendar className="h-6 w-6 text-white" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Date of Completion</h4>
                                    <p className="text-lg font-medium text-brand-secondary">
                                        {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                
                                <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-200">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mb-4">
                                        <CheckCircle className="h-6 w-6 text-white" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Verification Status</h4>
                                    <p className="text-lg font-medium text-green-600">Verified & Authentic</p>
                                </div>
                            </div>

                            {/* Verification Footer */}
                            <div className="border-t-2 border-dashed border-gray-300 pt-8">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-4">
                                        Certificate ID: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{certId}</span>
                                    </p>
                                    <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-semibold">Verified by LearnBridgeEdu</span>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        This certificate can be verified online at any time using the certificate ID above.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-12 rounded-3xl shadow-2xl border-4 border-red-200 text-center animate-fade-in">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                            <AlertTriangle className="h-10 w-10 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-red-700 mb-4">Certificate Verification Failed</h1>
                        <p className="text-lg text-gray-600 mb-8">Certificate not found. It may have been deleted or the link is incorrect.</p>
                        <Button asChild size="lg" className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                            <Link href="/">Return to Home</Link>
                        </Button>
                    </div>
                )}
                
                {/* Footer */}
                <div className="text-center mt-8">
                    <Link href="/" className="inline-flex items-center gap-3 text-gray-600 hover:text-gray-800 transition-colors">
                        <div className="w-8 h-8 bg-brand-secondary rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold">Powered by LearnBridgeEdu</span>
                    </Link>
                </div>
            </main>
        </div>
    );
}
