import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, AppText } from '@/components/ui';
import { ListRow } from '@/components/form';

export type HubItem = { route: string; title: string; subtitle?: string; icon?: any };

/** A simple navigation hub: heading + a tappable list of sections. */
export function HubList({ heading, subheading, items }: { heading: string; subheading?: string; items: HubItem[] }) {
    const router = useRouter();
    return (
        <Screen scroll>
            <AppText size="xl" weight="800">{heading}</AppText>
            {subheading ? <AppText muted size="sm">{subheading}</AppText> : null}
            <View style={{ gap: 10, marginTop: 8 }}>
                {items.map((it) => (
                    <ListRow key={it.route} title={it.title} subtitle={it.subtitle} leadingIcon={it.icon} onPress={() => router.push(it.route as any)} />
                ))}
            </View>
        </Screen>
    );
}
