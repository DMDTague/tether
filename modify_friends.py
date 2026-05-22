import re

with open('/Users/dylantague/Desktop/tether/mobile/app/(tabs)/friends.tsx', 'r') as f:
    content = f.read()

# 1. Replace FriendCard
old_friend_card = r"""const FriendCard = React\.memo.*?</AnimatedPressable>
    </Animated\.View>
  \);
}, \(prev, next\) => \{"""

new_friend_card = """const FriendCard = React.memo(({ friend, onPress, index }: {
  friend: FriendPresence; onPress: () => void; index: number;
}) => {
  const cfg = STATUS_CFG[friend.status];
  const live = friend.status !== 'offline';
  const slideIn = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideIn, {
        toValue: 1, duration: motion.fast,
        delay: index * motion.staggerDelay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1, duration: motion.fast,
        delay: index * motion.staggerDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const translateY = slideIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY }] }}>
      <AnimatedPressable
        onPress={() => {
          if (live) onPress();
        }}
        disabled={!live}
        hapticOnPress={live ? 'soft' : 'none'}
        hapticOnRelease={live ? 'none' : 'none'}
        style={[
          s.card,
          live ? {
            backgroundColor: 'rgba(26,15,68,0.60)',
            borderColor: cfg.border,
            shadowColor: cfg.glow,
            shadowOpacity: 0.3,
            shadowRadius: spacing.xl,
            shadowOffset: { width: 0, height: spacing.md },
          } : {
            backgroundColor: 'rgba(13,11,26,0.40)',
            opacity: 0.45,
          },
        ]}
      >
        {live && <View style={[s.cardLeftGlow, { backgroundColor: cfg.color }]} />}

        <View style={s.cardHeaderRow}>
          <View style={[
            s.av,
            { borderColor: live ? cfg.color : colors.border2 },
            live && {
              shadowColor: cfg.glow,
              shadowOpacity: 0.6,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}>
            <Text style={[s.avTxt, { color: live ? cfg.color : colors.text3 }]}>
              {friend.user.initials}
            </Text>
          </View>

          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[s.name, !live && { color: colors.text3 }]}>
              {friend.user.displayName}
            </Text>
            {!live && <Text style={{ fontSize: typography.size.caption, color: colors.text3 }}>Offline</Text>}
          </View>

          {live && (
            <View style={[s.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <BreathingRing color={cfg.color} size={6} />
              <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          )}
        </View>

        {live && friend.track && (
          <View style={s.cardContentRow}>
            <View style={[s.miniArt, { backgroundColor: cfg.bg }]}>
              <Text style={[s.miniArtTxt, { color: colors.text }]}>
                {friend.track.trackName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.trackNameBold} numberOfLines={1}>{friend.track.trackName}</Text>
              <Text style={s.artistNameCaption} numberOfLines={1}>{friend.track.artistName}</Text>
            </View>
          </View>
        )}

        {live && (
          <View style={s.cardActionRow}>
            <AnimatedPressable style={s.listenBtn} onPress={onPress} hapticOnPress="medium">
              <Text style={s.listenBtnText}>♫ Listen</Text>
            </AnimatedPressable>
            <AnimatedPressable style={s.momentBtn} onPress={() => {}} hapticOnPress="soft">
              <Text style={s.momentBtnText}>→ Send moment</Text>
            </AnimatedPressable>
            
            {friend.sealedCapsuleCount ? (
              <View style={s.capsuleBadge}>
                <Text style={{ fontSize: 10 }}>🌙</Text>
                <Text style={s.capsuleCount}>{friend.sealedCapsuleCount}</Text>
              </View>
            ) : null}
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}, (prev, next) => {"""
content = re.sub(old_friend_card, new_friend_card, content, flags=re.DOTALL)

# 2. Replace CARD_HEIGHT, getItemLayout, Feed Data setup, Header, FlatList
old_middle = r"""const CARD_HEIGHT = 80;
const SEPARATOR_HEIGHT = spacing\.xs;

const getItemLayout =.*?/>"""

new_middle = """const SEPARATOR_HEIGHT = spacing.sm;

// ── Main Screen ───────────────────────────────────────────────
export default function FriendsScreen() {
  const { setActiveVibe } = useVibe();
  const { friends, send, isOffline, showReconnecting } = useWS();
  const connectionState = isOffline ? 'paused' : showReconnecting ? 'reconnecting' : 'synced';
  const [stage, setStage] = useState<FriendPresence | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [matchesVisible, setMatchesVisible] = useState(false);
  
  const { user, token: authToken } = useAuth();
  const { session, isInSession, syncMode, joinSession, leaveSession, incrementPulse, restoreFromReconnect } = useSession({ hasPremium: user?.hasPremium });
  const { playback, seek, syncToHost } = usePlayback({ syncMode });
  
  const adPass = useAdPass({ adFreeUntil: user?.adFreeUntil, token: authToken || undefined });
  
  // Sort friends: live first
  const sortedFriends = [...friends].sort((a, b) => {
    if (a.status !== 'offline' && b.status === 'offline') return -1;
    if (a.status === 'offline' && b.status !== 'offline') return 1;
    return 0;
  });

  const feedData: any[] = [];
  let hasOffline = false;
  let hasLive = false;
  sortedFriends.forEach(f => {
    if (f.status !== 'offline' && !hasLive) {
      feedData.push({ type: 'header', title: 'ACTIVE NOW', count: sortedFriends.filter(x => x.status !== 'offline').length });
      hasLive = true;
    }
    if (f.status === 'offline' && !hasOffline) {
      feedData.push({ type: 'header', title: 'OFFLINE' });
      hasOffline = true;
    }
    feedData.push({ type: 'friend', data: f });
  });

  const handleSetStage = (f: FriendPresence | null) => {
    setStage(f);
    if (f) {
      const v = f.track?.artGradient === 'blue' ? 'chill' : 'edm';
      setActiveVibe({
        themeColors: f.track?.artGradient === 'blue' ? ['#00C9FF', '#92FE9D'] : ['#FF0055', '#4A00E0'],
        primaryVibe: v
      });
      haptics.select();
    } else {
      setActiveVibe(null);
    }
  };

  const handleMatchVibes = async () => {
    // Tollbooth Check
    if (!user?.hasPremium && !adPass.requestJoin()) {
      return;
    }

    setIsAuthorizing(true);
    haptics.tap();
    let token = await getStoredToken();
    if (!token) {
      token = await authorize();
    }
    setIsAuthorizing(false);
    if (token && stage) {
      haptics.confirm();
      joinSession({
        id: `sess-${stage.userId}`,
        hostId: stage.user.id,
        host: stage.user,
        track: stage.track!,
        isPaused: false,
        listeners: [],
        trackStartEpoch: Date.now(),
      });
      syncToHost(stage.track!.trackId || 'unknown', 0);
      setStage(null);
    }
  };

  // Listen for WS messages (e.g. reconnect_ack)
  useEffect(() => {
    return wsEventEmitter.subscribe(msg => {
      if (msg.type === 'reconnect_ack' && session?.id === msg.sessionId) {
        restoreFromReconnect(msg.positionMs, msg.isPaused, msg.listeners);
        seek(msg.positionMs);
        if (!msg.isPaused) syncToHost(session.track.trackId || 'unknown', msg.positionMs);
      }
    });
  }, [session, restoreFromReconnect, seek, syncToHost]);

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.hdr}>
        <View>
          <Text style={s.logo}>tether</Text>
          <Text style={s.greeting}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.displayName?.split(' ')[0] || 'Dylan'}</Text>
        </View>
        <AnimatedPressable 
          style={s.searchPill}
          onPress={() => { haptics.tap(); setMatchesVisible(true); }}
          hapticOnPress="soft"
        >
          <BreathingRing color={colors.spark} size={6} />
          <Text style={s.searchPillText}>Find your vibe...</Text>
        </AnimatedPressable>
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: spacing.lg, 
          paddingBottom: 140,
          ...(sortedFriends.length === 0 && { flexGrow: 1 })
        }}
        showsVerticalScrollIndicator={false}
        data={feedData}
        keyExtractor={(item: any) => item.type === 'header' ? item.title : item.data.userId}
        ListHeaderComponent={
          <View style={{ marginHorizontal: -spacing.lg }}>
            <SuggestedVibes />
          </View>
        }
        renderItem={({ item, index }) => {
          if (item.type === 'header') {
            return (
              <View style={s.sectionHeader}>
                {item.title === 'OFFLINE' && <View style={s.divider} />}
                <Text style={s.sectionLabel}>
                  {item.title} {item.count ? `(${item.count})` : ''}
                </Text>
              </View>
            );
          }
          return <FriendCard friend={item.data} onPress={() => item.data.status !== 'offline' && handleSetStage(item.data)} index={index} />;
        }}
        windowSize={5}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        initialNumToRender={10}
        ItemSeparatorComponent={() => <View style={{ height: SEPARATOR_HEIGHT }} />}
      />"""

content = re.sub(old_middle, new_middle, content, flags=re.DOTALL)

# 3. Add new styles
style_insert_marker = r"""  card: \{
    height: CARD_HEIGHT,"""

style_insert_replacement = """  // Header Greeting
  greeting: {
    fontSize: typography.size.caption,
    color: colors.text3,
    marginTop: 2,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(124,95,230,0.06)',
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchPillText: {
    fontSize: typography.size.caption,
    color: colors.text3,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },

  card: {"""

content = content.replace(style_insert_marker, style_insert_replacement)

# Remove height: CARD_HEIGHT, and flex-direction row from card
content = content.replace("    height: CARD_HEIGHT,\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: spacing.md,\n", "    flexDirection: 'column',\n    gap: spacing.sm,\n    paddingVertical: spacing.md,\n")

# Add new styles at the end of card styles
card_styles_addition = """  cardLeftGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: radii.lg,
    borderBottomLeftRadius: radii.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginLeft: 44 + spacing.sm, // av width + gap
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginLeft: 44 + spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginLeft: 'auto',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  miniArt: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniArtTxt: {
    fontSize: typography.size.headline,
    fontWeight: 'bold',
  },
  trackNameBold: {
    fontSize: typography.size.body,
    fontWeight: '600',
    color: colors.text,
  },
  artistNameCaption: {
    fontSize: typography.size.footnote,
    color: colors.text2,
    marginTop: 2,
  },
  listenBtn: {
    backgroundColor: colors.spark,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  listenBtnText: {
    color: '#fff',
    fontSize: typography.size.caption,
    fontWeight: '600',
  },
  momentBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border2,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  momentBtnText: {
    color: colors.text2,
    fontSize: typography.size.caption,
    fontWeight: '500',
  },"""

content = content.replace("    backgroundColor: 'rgba(124,95,230,0.05)',\n  },\n  avTxt:", "    backgroundColor: 'rgba(124,95,230,0.05)',\n  },\n" + card_styles_addition + "\n  avTxt:")

# Fix avatar to 48
content = content.replace("    width: 44,\n    height: 44,\n    borderRadius: 22,\n    borderWidth: 1.5,", "    width: 48,\n    height: 48,\n    borderRadius: 24,\n    borderWidth: 2,")

with open('/Users/dylantague/Desktop/tether/mobile/app/(tabs)/friends.tsx', 'w') as f:
    f.write(content)
