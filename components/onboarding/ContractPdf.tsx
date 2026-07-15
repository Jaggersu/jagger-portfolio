'use client';

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    PDFViewer,
    PDFDownloadLink,
} from '@react-pdf/renderer';

Font.register({
    family: 'NotoSansTC',
    src: '/fonts/noto-sans-tc-400.woff2',
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'NotoSansTC',
        fontSize: 11,
        lineHeight: 1.5,
        color: '#111',
    },
    title: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 12,
    },
    heading: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 6,
        marginTop: 10,
    },
    paragraph: {
        marginBottom: 6,
        textAlign: 'justify',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        width: 80,
        fontWeight: 'bold',
    },
    value: {
        flex: 1,
    },
    signatureBox: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 8,
        width: '60%',
    },
    signatureLabel: {
        fontSize: 10,
        color: '#555',
        marginBottom: 4,
    },
    signatureName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 24,
        left: 40,
        right: 40,
        fontSize: 9,
        textAlign: 'center',
        color: '#777',
    },
});

export interface ContractData {
    partyName: string;
    partyEmail: string;
    signature?: string;
    signedAt?: string;
    budget?: string;
    timeline?: string;
}

function formatDate(date?: string) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function ContractDocument({ partyName, partyEmail, signature, signedAt, budget, timeline }: ContractData) {
    const today = formatDate(new Date().toISOString());
    const signDate = signedAt ? formatDate(signedAt) : '';
    const budgetDisplay = budget ? `NT$ ${budget}` : '依件報價';
    const timelineDisplay = timeline || '依需求議定';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>設計服務合約書</Text>

                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>甲方：</Text>
                        <Text style={styles.value}>Jagger OS / Jagger Su（jaggersu@gmail.com）</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>乙方：</Text>
                        <Text style={styles.value}>{partyName || '（尚未填寫）'}（{partyEmail || '（尚未填寫）'}）</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>簽約日：</Text>
                        <Text style={styles.value}>{signDate || today}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>方案：</Text>
                        <Text style={styles.value}>散戶單件計價（ON-DEMAND）</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>專案報價：</Text>
                        <Text style={styles.value}>{budgetDisplay}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>交付期限：</Text>
                        <Text style={styles.value}>{timelineDisplay}</Text>
                    </View>
                </View>

                <Text style={styles.heading}>一、服務內容</Text>
                <Text style={styles.paragraph}>
                    甲方依乙方需求提供單件式設計服務，範圍包含平面素材、數位圖文、社群素材等。每件服務採個別報價、個別交付，無長期綁約或月費。
                </Text>

                <Text style={styles.heading}>二、報價與付款</Text>
                <Text style={styles.paragraph}>
                    本次專案報價為 {budgetDisplay}，經乙方確認後付款。甲方收到款項後始開始製作。若乙方於製作開始前取消，可全額退款；製作開始後恕不退款。
                </Text>

                <Text style={styles.heading}>三、交付與修改</Text>
                <Text style={styles.paragraph}>
                    甲方於收到款項後 {timelineDisplay} 內提供初稿。乙方享有 2 次小幅度修改機會；涉及新增範圍或大幅度調整，甲方得重新報價。
                </Text>

                <Text style={styles.heading}>四、智慧財產權</Text>
                <Text style={styles.paragraph}>
                    乙方於付清款項後取得最終檔案之使用權。原始檔、設計源檔與相關源碼仍歸甲方所有，除非雙方另有書面約定。
                </Text>

                <Text style={styles.heading}>五、保密義務</Text>
                <Text style={styles.paragraph}>
                    雙方對於專案相關資訊、檔案與溝通內容負有保密義務，未經對方同意不得揭露予第三人。
                </Text>

                <Text style={styles.heading}>六、爭議處理</Text>
                <Text style={styles.paragraph}>
                    本合約以中華民國法律為準據法。雙方同意以誠信協商解決爭議；協商不成，雙方同意以台北地方法院為第一審管轄法院。
                </Text>

                {signature && (
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>乙方電子簽名</Text>
                        <Text style={styles.signatureName}>{signature}</Text>
                        <Text style={{ fontSize: 10, marginTop: 4 }}>{signDate || today}</Text>
                    </View>
                )}

                <Text style={styles.footer}>
                    本合約由 Jagger OS 線上服務平台自動產生，簽署後即視為雙方同意上述條款。
                </Text>
            </Page>
        </Document>
    );
}

export default function ContractPreview({ data }: { data: ContractData }) {
    return (
        <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
            <ContractDocument {...data} />
        </PDFViewer>
    );
}

export function ContractDownloadButton({ data }: { data: ContractData }) {
    const fileName = `jagger-os-contract-${data.partyEmail || 'on-demand'}.pdf`;
    const dlIconRef = React.useRef<any>(null);

    return (
        <PDFDownloadLink
            document={<ContractDocument {...data} />}
            fileName={fileName}
            style={{ textDecoration: 'none' }}
        >
            {({ loading }) => (
                <button
                    onMouseEnter={() => dlIconRef.current?.startAnimation?.()}
                    onMouseLeave={() => dlIconRef.current?.stopAnimation?.()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FF5500] text-black font-bold text-[11px] tracking-widest rounded-lg hover:bg-white transition-colors cursor-pointer"
                >
                    {loading ? (
                        '產生 PDF 中…'
                    ) : (
                        <>
                            下載合約 PDF
                            {/* Dynamically import or render standard animation */}
                            <svg 
                                style={{ display: 'none' }} 
                                ref={(el: any) => {
                                    if (el) {
                                        dlIconRef.current = {
                                            startAnimation: () => {
                                                const tray = el.parentNode.querySelector('.tray');
                                                const arrowHead = el.parentNode.querySelector('.arrow-head');
                                                const arrowStem = el.parentNode.querySelector('.arrow-stem');
                                                if (tray) {
                                                    tray.style.transform = 'translateY(1px) scale(1.03)';
                                                    tray.style.transition = 'transform 0.15s ease';
                                                }
                                                if (arrowHead) {
                                                    arrowHead.style.transform = 'translateY(2px)';
                                                    arrowHead.style.transition = 'transform 0.15s ease';
                                                }
                                                if (arrowStem) {
                                                    arrowStem.style.transform = 'translateY(2px)';
                                                    arrowStem.style.transition = 'transform 0.15s ease';
                                                }
                                            },
                                            stopAnimation: () => {
                                                const tray = el.parentNode.querySelector('.tray');
                                                const arrowHead = el.parentNode.querySelector('.arrow-head');
                                                const arrowStem = el.parentNode.querySelector('.arrow-stem');
                                                if (tray) {
                                                    tray.style.transform = 'translateY(0) scale(1)';
                                                }
                                                if (arrowHead) {
                                                    arrowHead.style.transform = 'translateY(0)';
                                                }
                                                if (arrowStem) {
                                                    arrowStem.style.transform = 'translateY(0)';
                                                }
                                            }
                                        };
                                    }
                                }}
                            />
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ overflow: "visible" }}
                            >
                                <path className="tray" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" style={{ transformOrigin: "center bottom" }} />
                                <path className="arrow-stem" d="M12 15V3" style={{ transformOrigin: "center" }} />
                                <path className="arrow-head" d="m17 10-5 5-5-5" style={{ transformOrigin: "center" }} />
                            </svg>
                        </>
                    )}
                </button>
            )}
        </PDFDownloadLink>
    );
}
