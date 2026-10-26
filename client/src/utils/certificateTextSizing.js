/**
 * Utility functions to calculate fixed font sizes for CertificateCanvas
 * ensuring text fits cleanly within the 1600x1131 resolution without truncation.
 */

export function getParticipantNameSize(name = "", isPpsu = false) {
  const length = String(name).trim().length;
  if (isPpsu) {
    if (length <= 20) {
      return { fontSize: "96px", lineHeight: "1.05" };
    } else if (length <= 30) {
      return { fontSize: "82px", lineHeight: "1.08" };
    } else if (length <= 42) {
      return { fontSize: "68px", lineHeight: "1.1" };
    } else {
      return { fontSize: "54px", lineHeight: "1.15" };
    }
  }

  if (length <= 20) {
    return { fontSize: "80px", lineHeight: "1.05" };
  } else if (length <= 30) {
    return { fontSize: "66px", lineHeight: "1.1" };
  } else if (length <= 42) {
    return { fontSize: "54px", lineHeight: "1.12" };
  } else {
    return { fontSize: "44px", lineHeight: "1.15" };
  }
}

export function getCertificateTitleSize(title = "", isPpsu = false) {
  const length = String(title).trim().length;
  if (isPpsu) {
    if (length <= 25) {
      return { fontSize: "72px", lineHeight: "1.1" };
    } else if (length <= 40) {
      return { fontSize: "58px", lineHeight: "1.12" };
    } else {
      return { fontSize: "48px", lineHeight: "1.18" };
    }
  }

  if (length <= 25) {
    return { fontSize: "56px", lineHeight: "1.1" };
  } else if (length <= 40) {
    return { fontSize: "46px", lineHeight: "1.15" };
  } else {
    return { fontSize: "38px", lineHeight: "1.2" };
  }
}

export function getDescriptionSize(description = "", isPpsu = false) {
  const length = String(description).trim().length;
  if (isPpsu) {
    if (length <= 120) {
      return { fontSize: "26px", lineHeight: "1.38" };
    } else if (length <= 180) {
      return { fontSize: "24px", lineHeight: "1.38" };
    } else {
      return { fontSize: "22px", lineHeight: "1.35" };
    }
  }

  if (length <= 120) {
    return { fontSize: "22px", lineHeight: "1.4" };
  } else if (length <= 180) {
    return { fontSize: "20px", lineHeight: "1.4" };
  } else {
    return { fontSize: "18px", lineHeight: "1.35" };
  }
}
