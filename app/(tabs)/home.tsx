import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Timetable data
const timeTable: Record<string, Array<{ name: string; time: string; icon: string }>> = {
  Mon: [
    { name: 'Oral Pathology Lecture', time: '7:45 AM - 8:45 AM', icon: 'school-outline' },
    { name: 'General Medicine Lecture', time: '2:15 PM - 3:15 PM', icon: 'school-outline' },
  ],
  Tue: [
    { name: 'Crown & Bridge Lab / Ortho', time: '8:45 AM - 9:45 AM', icon: 'flask-outline' },
    { name: 'OPD', time: '2:15 PM - 3:15 PM', icon: 'medical-outline' },
  ],
  Wed: [
    { name: 'Conservative Dentistry', time: '7:45 AM - 8:45 AM', icon: 'fitness-outline' },
    { name: 'Oral Medicine Lecture', time: '8:45 AM - 9:45 AM', icon: 'school-outline' },
    { name: 'Oral Pathology Lab', time: '2:15 PM - 3:15 PM', icon: 'flask-outline' },
  ],
  Thu: [
    { name: 'Prosthodontics Lecture', time: '7:45 AM - 8:45 AM', icon: 'school-outline' },
    { name: 'Periodontics Lecture', time: '8:45 AM - 9:45 AM', icon: 'school-outline' },
    { name: 'General Surgery Lecture', time: '2:15 PM - 3:15 PM', icon: 'school-outline' },
  ],
  Fri: [
    { name: 'Oral Pathology Lecture', time: '8:45 AM - 9:45 AM', icon: 'school-outline' },
    { name: 'General Medicine Lecture', time: '2:15 PM - 3:15 PM', icon: 'school-outline' },
  ],
  Sat: [
    { name: 'Pedodontics Lecture', time: '7:45 AM - 8:45 AM', icon: 'school-outline' },
    { name: 'OPD', time: '8:45 AM - 9:45 AM', icon: 'medical-outline' },
    { name: 'OPD', time: '2:15 PM - 3:15 PM', icon: 'medical-outline' },
  ],
  Sun: [],
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HomeScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [progressAnim] = useState(new Animated.Value(0));
  const [percentageAnim] = useState(new Animated.Value(0));
  const [percentageText, setPercentageText] = useState('0'); // <-- ADDED

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const targetPercentage = 75;

  useEffect(() => {
    // <-- CHANGED (This whole block is updated)
    // Add a listener to the JS-driven animation
    const listenerId = percentageAnim.addListener(({ value }) => {
      // Round the value and set it as a string in our new state
      setPercentageText(Math.round(value).toString());
    });

    // Start the parallel animations
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: targetPercentage,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(percentageAnim, {
        toValue: targetPercentage,
        duration: 1500,
        useNativeDriver: false, // This must be false to run on the JS thread
      }),
    ]).start();

    // Cleanup: remove the listener when the component unmounts
    return () => {
      percentageAnim.removeListener(listenerId);
    };
  }, [percentageAnim, targetPercentage]); // Added dependencies

  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const getWeekDates = () => {
    const dayOfWeek = selectedDate.getDay();
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getScheduleForDate = (date: Date) => {
    const dayName = dayNames[date.getDay()];
    return timeTable[dayName] || [];
  };

  const weekDates = getWeekDates();
  const calendarDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const schedule = getScheduleForDate(selectedDate);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.userName}>Shobhan</Text>
          </View>
          <TouchableOpacity style={styles.profilePic} activeOpacity={0.7}>
            <Ionicons name="person" size={24} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        {/* Stats Card with Gradient */}
        <View style={styles.statsCard}>
          <View style={styles.statsCardInner}>
            {/* Circular Progress */}
            <View style={styles.progressSection}>
              <View style={styles.circularProgressContainer}>
                <Svg width={140} height={140}>
                  <Circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="rgba(139, 92, 246, 0.15)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <AnimatedCircle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#8b5cf6"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin="70, 70"
                  />
                </Svg>
                <View style={styles.progressTextContainer}>
                  {/* <-- CHANGED (This block is updated) */}
                  <Animated.Text style={styles.progressPercentage}>
                    {percentageText}
                    <Text style={styles.percentSymbol}>%</Text>
                  </Animated.Text>
                  <Text style={styles.progressLabel}>Attendance</Text>
                </View>
              </View>
            </View>

            {/* Stats Right */}
            <View style={styles.statsRight}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statNumber}>124</Text>
                  <Text style={styles.statLabel}>Classes Attended</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={styles.statNumber}>5</Text>
                  <Text style={styles.statLabel}>Safe to Skip</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Week Days Selector */}
        <View style={styles.weekSection}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daySelectorContainer}
          >
            {weekDates.map((date, index) => {
              const isSelected = isSameDate(date, selectedDate);
              const isTodayDate = isToday(date);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateItem,
                    isSelected && styles.dateItemActive,
                  ]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                    {calendarDayNames[index]}
                  </Text>
                  <Text style={[styles.dateLabel, isSelected && styles.dateLabelActive]}>
                    {date.getDate()}
                  </Text>
                  {isTodayDate && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Schedule Section */}
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleTitleRow}>
            <Text style={styles.sectionTitle}>
              {isToday(selectedDate) ? "Today's Classes" : `${dayNames[selectedDate.getDay()]}'s Classes`}
            </Text>
            <Text style={styles.classCount}>{schedule.length} {schedule.length === 1 ? 'class' : 'classes'}</Text>
          </View>
          
          {schedule.length === 0 ? (
            <View style={styles.noClassesContainer}>
              <View style={styles.noClassesIcon}>
                <Ionicons name="calendar-outline" size={48} color="#4b5563" />
              </View>
              <Text style={styles.noClassesText}>No classes today</Text>
              <Text style={styles.noClassesSubtext}>Enjoy your free time!</Text>
            </View>
          ) : (
            <View style={styles.scheduleList}>
              {schedule.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.scheduleCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.scheduleLeft}>
                    <View style={styles.scheduleIconContainer}>
                      <Ionicons name={item.icon as any} size={22} color="#8b5cf6" />
                    </View>
                    <View style={styles.scheduleContent}>
                      <Text style={styles.scheduleName}>{item.name}</Text>
                      <View style={styles.scheduleTimeContainer}>
                        <Ionicons name="time-outline" size={14} color="#6b7280" />
                        <Text style={styles.scheduleTime}>{item.time}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#4b5563" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262626',
  },
  statsCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  progressSection: {
    alignItems: 'center',
  },
  circularProgressContainer: {
    width: 140,
    height: 140,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  progressLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  statsRight: {
    flex: 1,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  statDivider: {
    height: 1,
    backgroundColor: '#262626',
  },
  weekSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  daySelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  dateItem: {
    width: 56,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dateItemActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  dayLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  dayLabelActive: {
    color: '#ffffff',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateLabelActive: {
    color: '#ffffff',
  },
  todayDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  scheduleSection: {
    marginBottom: 24,
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  classCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  scheduleList: {
    gap: 12,
  },
  scheduleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#262626',
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  scheduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  scheduleTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleTime: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  noClassesContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  noClassesIcon: {
    marginBottom: 16,
  },
  noClassesText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noClassesSubtext: {
    color: '#6b7280',
    fontSize: 14,
  },
  bottomPadding: {
    height: 100,
  },
});

export default HomeScreen;