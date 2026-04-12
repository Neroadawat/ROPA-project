"""
Legal Basis Rule Engine — keyword sets and decision rules for 7 PDPA legal bases.

Each rule maps a set of Thai/English keywords to a legal basis, PDPA section reference,
reasoning template, and optional caution note.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class LegalBasisRule:
    """A single rule mapping keywords to a PDPA legal basis."""
    legal_basis: str
    pdpa_section: str
    keywords: List[str] = field(default_factory=list)
    reasoning_template: str = ""
    caution: Optional[str] = None


# ---------------------------------------------------------------------------
# 7 PDPA Legal Bases — keyword sets
# ---------------------------------------------------------------------------

LEGAL_BASIS_RULES: List[LegalBasisRule] = [
    # 1. Consent — มาตรา 19
    LegalBasisRule(
        legal_basis="ความยินยอม (Consent)",
        pdpa_section="มาตรา 19",
        keywords=[
            "ความยินยอม", "consent", "ยินยอม", "ขอความยินยอม",
            "แบบฟอร์มยินยอม", "ลงนามยินยอม", "opt-in", "สมัครใจ",
            "การตลาด", "marketing", "โปรโมชั่น", "promotion",
            "ส่งข่าวสาร", "newsletter", "โฆษณา", "advertising",
            "แจ้งข้อมูลข่าวสาร", "ข้อเสนอพิเศษ",
        ],
        reasoning_template=(
            "กิจกรรมนี้เกี่ยวข้องกับการขอความยินยอมจากเจ้าของข้อมูล "
            "ตาม {pdpa_section} พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
        ),
        caution="ต้องได้รับความยินยอมอย่างชัดแจ้งก่อนเก็บรวบรวมข้อมูล และเจ้าของข้อมูลสามารถถอนความยินยอมได้ตลอดเวลา",
    ),

    # 2. Contract — มาตรา 24(3)
    LegalBasisRule(
        legal_basis="สัญญา (Contract)",
        pdpa_section="มาตรา 24(3)",
        keywords=[
            "สัญญา", "contract", "ข้อตกลง", "agreement",
            "ซื้อขาย", "purchase", "sale", "บริการ", "service",
            "ลูกค้า", "customer", "client", "สมาชิก", "member",
            "จ้างงาน", "employment", "พนักงาน", "employee",
            "ทะเบียน", "registration", "สมัคร", "subscribe",
            "จองห้อง", "booking", "reservation", "เช่า", "lease",
            "ส่งมอบ", "delivery", "คำสั่งซื้อ", "order",
        ],
        reasoning_template=(
            "กิจกรรมนี้เกี่ยวข้องกับการให้บริการตามสัญญา "
            "ตาม {pdpa_section} พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
        ),
        caution=None,
    ),

    # 3. Legal Obligation — มาตรา 24(6)
    LegalBasisRule(
        legal_basis="หน้าที่ตามกฎหมาย (Legal Obligation)",
        pdpa_section="มาตรา 24(6)",
        keywords=[
            "กฎหมาย", "law", "legal", "พ.ร.บ.", "พระราชบัญญัติ",
            "ข้อบังคับ", "regulation", "ภาษี", "tax",
            "ประกันสังคม", "social security", "แรงงาน", "labor",
            "รายงาน", "report", "หน่วยงานรัฐ", "government",
            "ปปง.", "aml", "ฟอกเงิน", "anti-money laundering",
            "คปภ.", "oic", "ธปท.", "bot",
            "สรรพากร", "revenue", "บัญชี", "accounting",
        ],
        reasoning_template=(
            "กิจกรรมนี้เกี่ยวข้องกับการปฏิบัติตามหน้าที่ตามกฎหมาย "
            "ตาม {pdpa_section} พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
        ),
        caution="ต้องระบุกฎหมายที่เกี่ยวข้องให้ชัดเจน",
    ),

    # 4. Vital Interest — มาตรา 24(2)
    LegalBasisRule(
        legal_basis="ประโยชน์สำคัญต่อชีวิต (Vital Interest)",
        pdpa_section="มาตรา 24(2)",
        keywords=[
            "ชีวิต", "life", "vital", "ฉุกเฉิน", "emergency",
            "อุบัติเหตุ", "accident", "ปฐมพยาบาล", "first aid",
            "สุขภาพ", "health", "โรค", "disease", "ระบาด", "epidemic",
            "ภัยพิบัติ", "disaster", "ความปลอดภัย", "safety",
            "กู้ชีพ", "rescue", "แพทย์", "medical",
        ],
        reasoning_template=(
            "กิจกรรมนี้เกี่ยวข้องกับการป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือสุขภาพ "
            "ตาม {pdpa_section} พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
        ),
        caution="ใช้ได้เฉพาะกรณีที่เจ้าของข้อมูลไม่สามารถให้ความยินยอมได้",
    ),

    # 5. Public Task — มาตรา 24(4)
    LegalBasisRule(
        legal_basis="ภารกิจของรัฐ (Public Task)",
        pdpa_section="มาตรา 24(4)",
        keywords=[
            "ภารกิจ", "mission", "public task", "สาธารณะ", "public",
            "รัฐ", "state", "government", "ราชการ", "official",
            "อำนาจรัฐ", "authority", "นโยบาย", "policy",
            "บริการสาธารณะ", "public service", "ทะเบียนราษฎร",
            "ใบอนุญาต", "license", "permit",
        ],
        reasoning_template=(
            "กิจกรรมนี้เกี่ยวข้องกับการปฏิบัติภารกิจเพื่อประโยชน์สาธารณะหรือการใช้อำนาจรัฐ "
            "ตาม {pdpa_section} พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
        ),
        caution=None,
    ),

    # 6. Legitimate Interest — มาตรา 24(5)
    LegalBasisRule(
        legal_basis="ประโยชน์อันชอบธรรม (Legitimate Interest)",
        pdpa_section="มาตรา 24(5)",
        keywords=[
            "ประโยชน์อันชอบธรรม", "legitimate interest",
            "ความปลอดภัยเครือข่าย", "network security",
            "ป้องกันการฉ้อโกง", "fraud prevention", "fraud",
            "กล้องวงจรปิด", "cctv", "surveillance",
            "ตรวจสอบภายใน", "internal audit", "audit",
            "วิเคราะห์ธุรกิจ", "business analysis", "analytics",
            "ปรับปรุงบริการ", "improve service",
            "ความมั่นคง", "security", "it security",
        ],
        reasoning_template=(
            "กิจกรรมนี้เกี่ยวข้องกับประโยชน์อันชอบธรรมขององค์กร "
            "ตาม {pdpa_section} พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
        ),
        caution="ต้องชั่งน้ำหนักระหว่างประโยชน์ขององค์กรกับสิทธิของเจ้าของข้อมูล (balancing test)",
    ),

    # 7. Archiving / Research — มาตรา 24(1)
    LegalBasisRule(
        legal_basis="จดหมายเหตุ/วิจัย (Archiving/Research)",
        pdpa_section="มาตรา 24(1)",
        keywords=[
            "วิจัย", "research", "สถิติ", "statistics", "statistical",
            "จดหมายเหตุ", "archive", "archiving",
            "ประวัติศาสตร์", "historical", "history",
            "วิชาการ", "academic", "มหาวิทยาลัย", "university",
            "สำรวจ", "survey", "แบบสอบถาม", "questionnaire",
            "วิทยานิพนธ์", "thesis", "ผลงานวิจัย",
        ],
        reasoning_template=(
            "กิจกรรมนี้เกี่ยวข้องกับการจัดทำเอกสารประวัติศาสตร์ จดหมายเหตุ "
            "หรือการวิจัยทางวิทยาศาสตร์/สถิติ "
            "ตาม {pdpa_section} พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"
        ),
        caution="ต้องมีมาตรการคุ้มครองที่เหมาะสม เช่น การทำให้ข้อมูลไม่สามารถระบุตัวบุคคลได้ (anonymization)",
    ),
]
