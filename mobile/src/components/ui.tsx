// Minimal reusable UI kit over RN primitives. All consume useTheme().
import React from 'react';
import {
    Text,
    View,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useLang } from '@/lib/i18n';
import { fontFamily } from '@/theme/fonts';

export function Screen({
    children,
    scroll,
    refreshing,
    onRefresh,
    style,
}: {
    children: React.ReactNode;
    scroll?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    style?: ViewStyle;
}) {
    const t = useTheme();
    const inner = scroll ? (
        <ScrollView
            contentContainerStyle={[{ padding: t.spacing.lg, gap: t.spacing.md }, style]}
            refreshControl={
                onRefresh ? (
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.color.brand} />
                ) : undefined
            }
            keyboardShouldPersistTaps="handled"
        >
            {children}
        </ScrollView>
    ) : (
        <View style={[{ flex: 1, padding: t.spacing.lg, gap: t.spacing.md }, style]}>{children}</View>
    );
    return <SafeAreaView style={{ flex: 1, backgroundColor: t.color.bg }}>{inner}</SafeAreaView>;
}

export function AppText({
    children,
    size = 'md',
    weight = '400',
    color,
    muted,
    style,
    numberOfLines,
}: {
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
    weight?: TextStyle['fontWeight'];
    color?: string;
    muted?: boolean;
    style?: TextStyle;
    numberOfLines?: number;
}) {
    const t = useTheme();
    const { lang } = useLang();
    return (
        <Text
            numberOfLines={numberOfLines}
            style={[
                { fontSize: t.font[size], fontWeight: weight, color: color || (muted ? t.color.textMuted : t.color.text), fontFamily: fontFamily(weight, lang) },
                style,
            ]}
        >
            {children}
        </Text>
    );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    const t = useTheme();
    return (
        <View
            style={[
                {
                    backgroundColor: t.color.surface,
                    borderRadius: t.radius.lg,
                    padding: t.spacing.lg,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: t.color.border,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    loading,
    disabled,
    icon,
    style,
}: {
    title: string;
    onPress?: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
}) {
    const t = useTheme();
    const { lang } = useLang();
    const isPrimary = variant === 'primary';
    const isDanger = variant === 'danger';
    const bg = isPrimary ? t.color.brand : isDanger ? t.color.danger : variant === 'secondary' ? t.color.surfaceAlt : 'transparent';
    const fg = isPrimary ? t.color.brandText : isDanger ? '#fff' : t.color.text;
    return (
        <Pressable
            onPress={disabled || loading ? undefined : onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
                {
                    minHeight: 48,
                    borderRadius: t.radius.md,
                    backgroundColor: bg,
                    borderWidth: variant === 'secondary' || variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
                    borderColor: t.color.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: t.spacing.sm,
                    paddingHorizontal: t.spacing.lg,
                    opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={fg} />
            ) : (
                <>
                    {icon}
                    <Text style={{ color: fg, fontWeight: '700', fontSize: t.font.md, fontFamily: fontFamily('700', lang) }}>{title}</Text>
                </>
            )}
        </Pressable>
    );
}

export function Loader({ label }: { label?: string }) {
    const t = useTheme();
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.md }}>
            <ActivityIndicator size="large" color={t.color.brand} />
            {label ? <AppText muted>{label}</AppText> : null}
        </View>
    );
}

export function EmptyState({
    title,
    description,
    icon,
    action,
}: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}) {
    const t = useTheme();
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.spacing.xl, gap: t.spacing.md }}>
            {icon}
            <AppText size="lg" weight="700" style={{ textAlign: 'center' }}>
                {title}
            </AppText>
            {description ? (
                <AppText muted style={{ textAlign: 'center' }}>
                    {description}
                </AppText>
            ) : null}
            {action}
        </View>
    );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'warning' | 'neutral' }) {
    const t = useTheme();
    const map = {
        success: t.color.success,
        warning: t.color.warning,
        neutral: t.color.textMuted,
    };
    const c = map[tone];
    return (
        <View style={{ backgroundColor: c + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: t.radius.pill }}>
            <Text style={{ color: c, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                {label}
            </Text>
        </View>
    );
}

// One labelled row in a details card.
export function InfoRow({
    icon,
    label,
    value,
    action,
}: {
    icon?: React.ReactNode;
    label: string;
    value: string;
    action?: React.ReactNode;
}) {
    const t = useTheme();
    const { lang } = useLang();
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.md,
                paddingVertical: t.spacing.sm + 2,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: t.color.border,
            }}
        >
            {icon ? (
                <View
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: t.radius.md,
                        backgroundColor: t.color.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {icon}
                </View>
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 10, color: t.color.textMuted, textTransform: lang === 'en' ? 'uppercase' : 'none', letterSpacing: lang === 'en' ? 0.8 : 0, marginBottom: 2, fontFamily: fontFamily('400', lang) }}>
                    {label}
                </Text>
                <AppText weight="600" numberOfLines={2}>
                    {value}
                </AppText>
            </View>
            {action}
        </View>
    );
}
