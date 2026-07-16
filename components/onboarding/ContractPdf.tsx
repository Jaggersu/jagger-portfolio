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
    src: '/fonts/noto-sans-tc-400.ttf',
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

                <Text style={styles.heading}>一、服務範疇</Text>
                <Text style={styles.paragraph}>
                    乙方依客戶所選方案，提供對應之視覺設計、網頁建置或 SaaS 產品開發等服務。具體交付項目、規格與時程，以本線上系統生成之確認數據為準。超出本合約約定範圍之額外需求須另行報價。
                </Text>

                <Text style={styles.heading}>二、修改次數與範圍變更</Text>
                <Text style={styles.paragraph}>
                    本案交付包含最多 2 次微調修正。超出次數之修改，或因客戶需求變更導致工作範圍擴大者，乙方得另行報價。客戶如於確認稿後要求重大方向調整，視同新增需求處理。
                </Text>

                <Text style={styles.heading}>三、費用、付款與執行時程</Text>
                <Text style={styles.paragraph}>
                    本合約服務費用總計為 {budgetDisplay}，執行時程為 {timelineDisplay}（自客戶完整提供執行所需素材之次日起算）。本服務採 100% 線上全額預付制，客戶完成付款後，合約始生履約效力，乙方即安排時程執行。
                </Text>

                <Text style={styles.heading}>四、智慧財產權歸屬</Text>
                <Text style={styles.paragraph}>
                    客戶完成全額付款後，乙方將本專案之最終定稿著作財產權完整移轉予客戶。乙方保留：(a) 作品集展示與參展權；(b) 工作流程中所使用之通用框架、元件庫及可重用程式碼之所有權。未獲客戶採用之提案稿，著作權仍歸乙方所有。
                </Text>

                <Text style={styles.heading}>五、客戶素材與侵權責任</Text>
                <Text style={styles.paragraph}>
                    客戶提供之文字、圖片、商標及其他素材，應保證合法取得且不侵害任何第三方之智慧財產權；因客戶素材引發之法律責任由客戶自行承擔。乙方所使用之正版圖庫及字型授權，僅限本專案用途，客戶不得另作他用或轉授權。
                </Text>

                <Text style={styles.heading}>六、合約終止與退款</Text>
                <Text style={styles.paragraph}>
                    本案因屬客製化按件計酬服務，付款後若乙方已開始執行：(a) 客戶主動終止時，已支付款項不予退還，乙方應交付終止前已完成之階段性半成品；(b) 乙方主動終止時，應於 7 個工作天內依未完成比例退還對應款項。
                </Text>

                <Text style={styles.heading}>七、保密條款</Text>
                <Text style={styles.paragraph}>
                    雙方同意對合作過程中取得之商業機密、未公開素材、客戶資料予以嚴格保密；未經對方書面同意，不得向第三方揭露。保密義務於合約終止後繼續存續 3 年。
                </Text>

                <Text style={styles.heading}>八、不可抗力</Text>
                <Text style={styles.paragraph}>
                    因天災、政府法規變動、網路基礎設施故障、第三方服務中斷（如雲端平台、金流閘道）等不可抗力事件，導致乙方無法如期履約者，乙方得就受影響部分順延時程，雙方均不得以此為由要求違約賠償。
                </Text>

                <Text style={styles.heading}>九、準據法與爭議解決</Text>
                <Text style={styles.paragraph}>
                    本合約受中華民國法律管轄。雙方應先以協商方式解決爭議；協商不成時，同意以臺灣桃園地方法院為第一審管轄法院。
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
