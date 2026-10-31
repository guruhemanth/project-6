import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
  header: { textAlign: 'center', marginBottom: 12, borderBottomWidth: 2, borderColor: '#ea580c', paddingBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#ea580c' },
  subtitle: { fontSize: 10, marginTop: 2, color: '#4b5563' },
  kpiContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, padding: 8, backgroundColor: '#fff7ed', borderRadius: 4 },
  kpiBox: { alignItems: 'center' },
  kpiLabel: { fontSize: 8, color: '#6b7280', textTransform: 'uppercase' },
  kpiValue: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  columnsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  column: { width: '48%' },
  colHeading: { fontSize: 11, fontWeight: 'bold', borderBottomWidth: 1, borderColor: '#d1d5db', paddingBottom: 3, marginBottom: 5, color: '#111827' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 0.5, borderColor: '#f3f4f6' },
  signatureSection: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 20 },
  signBox: { width: '30%', borderTopWidth: 1, borderColor: '#4b5563', paddingTop: 4, alignItems: 'center' },
  signText: { fontSize: 8, color: '#4b5563', fontWeight: 'bold' },
});

export const AuditReportPDF = ({ societyName, city, state, records = [], expenses = [] }) => {
  const totalCollections = records.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netBalance = totalCollections - totalExpenses;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🕉 {societyName ? societyName.toUpperCase() : 'FESTIVAL COMMITTEE'}</Text>
          <Text style={styles.subtitle}>Vinayaka Chavithi 2026 • Financial Statement & Audit Report</Text>
          <Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>
            Location: {[city, state].filter(Boolean).join(', ')} | Generated: {new Date().toLocaleString('en-IN')}
          </Text>
        </View>

        {/* KPI Summary Bar */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Gross Collections</Text>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>₹{totalCollections.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Outflows</Text>
            <Text style={[styles.kpiValue, { color: '#dc2626' }]}>- ₹{totalExpenses.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Net Balance (Surplus)</Text>
            <Text style={[styles.kpiValue, { color: netBalance >= 0 ? '#2563eb' : '#991b1b' }]}>
              ₹{netBalance.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* 2-Column Ledger: Collections vs Expenses */}
        <View style={styles.columnsContainer}>
          {/* Left Column: Top Collections */}
          <View style={styles.column}>
            <Text style={styles.colHeading}>Collections Summary ({records.length})</Text>
            {records.slice(0, 25).map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={{ width: '65%' }}>{r.name} (D.No: {r.door_number})</Text>
                <Text style={{ fontWeight: 'bold' }}>₹{Number(r.amount).toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>

          {/* Right Column: Categorized Expenses */}
          <View style={styles.column}>
            <Text style={styles.colHeading}>Itemized Outflows ({expenses.length})</Text>
            {expenses.map((e, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={{ width: '65%' }}>{e.category}: {e.description}</Text>
                <Text style={{ fontWeight: 'bold', color: '#dc2626' }}>₹{Number(e.amount).toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Official Notice Board Sign-Off Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signBox}>
            <Text style={styles.signText}>Committee President</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signText}>Treasurer</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signText}>Honorary Auditor</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
